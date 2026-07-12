from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable


class ReleaseError(Exception):
    pass


@dataclass(frozen=True)
class ReleasePaths:
    root: Path
    preview: Path
    stable: Path
    public: Path
    manifest: Path
    archive_dir: Path


@dataclass(frozen=True)
class ReleaseBuild:
    preview_html: str
    stable_html: str
    transformations: list[str]
    version: str
    source_sha256: str
    stable_sha256: str
    docs_sha256: str


@dataclass(frozen=True)
class ExistingState:
    stable_exists: bool
    docs_exists: bool
    manifest_exists: bool
    stable_sha256: str | None
    docs_sha256: str | None
    manifest_sha256: str | None
    stable_bytes: bytes | None
    docs_bytes: bytes | None
    manifest_bytes: bytes | None


REQUIRED_MARKERS = [
    "SPLAY_SUPABASE_CONFIG",
    "getSupabaseAuthClient",
    "signInWithPassword",
    "logoutSplay",
    "loadCloudState",
    "saveCloudState",
    "startSplayRealtimeSubscription",
    "stopSplayRealtimeSubscription",
    "recoverRealtimeAfterOnline",
    "createPersistableStateSnapshot",
    "prepareImportedState",
    "exportJSON",
    "importJSON",
    "exportWorkspaceSnapshotHTML",
]

SECRET_PATTERNS = [
    ("sb_secret_", re.compile(r"sb_secret_", re.IGNORECASE)),
    ("SUPABASE_SERVICE_ROLE", re.compile(r"SUPABASE_SERVICE_ROLE", re.IGNORECASE)),
    ("DATABASE_PASSWORD", re.compile(r"DATABASE_PASSWORD", re.IGNORECASE)),
    ("postgresql://", re.compile(r"postgresql://", re.IGNORECASE)),
    ("postgres://", re.compile(r"postgres://", re.IGNORECASE)),
]

TITLE_PREVIEW = "<title>Splay OS Cloud Preview</title>"
TITLE_STABLE = "<title>Splay OS Cloud</title>"
STORAGE_PREVIEW = "const STORAGE_KEY='splay_os_state_v5_preview_spatial';"
STORAGE_STABLE = "const STORAGE_KEY='splay_os_state_v5';"
SOURCE_PREVIEW = "const SOURCE_STORAGE_KEY='splay_os_state_v5';"
SOURCE_STABLE = "const SOURCE_STORAGE_KEY='splay_os_state_v5_preview_spatial';"
CLOUD_CACHE_PREFIX = "const CLOUD_CACHE_KEY_PREFIX='splay_os_cloud_cache_';"


class InlineScriptExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self._capture = False
        self._current: list[str] = []
        self.scripts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "script":
            return
        attr = {k.lower(): (v or "") for k, v in attrs}
        if "src" in attr:
            self._capture = False
            return
        script_type = attr.get("type", "").strip().lower()
        javascript_types = {
            "",
            "text/javascript",
            "application/javascript",
            "application/ecmascript",
            "text/ecmascript",
            "module",
        }
        self._capture = script_type in javascript_types
        self._current = []

    def handle_data(self, data: str) -> None:
        if self._capture:
            self._current.append(data)

    def handle_entityref(self, name: str) -> None:
        if self._capture:
            self._current.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if self._capture:
            self._current.append(f"&#{name};")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self._capture:
            self.scripts.append("".join(self._current))
            self._capture = False
            self._current = []


def log(label: str, message: str) -> None:
    print(f"[{label}] {message}")


def resolve_project_root() -> Path:
    return Path(__file__).resolve().parent


def get_paths(root: Path) -> ReleasePaths:
    return ReleasePaths(
        root=root,
        preview=root / "release" / "preview" / "splay_os_preview.html",
        stable=root / "release" / "stable" / "splay_os.html",
        public=root / "docs" / "index.html",
        manifest=root / "release" / "manifest.json",
        archive_dir=root / "release" / "archive",
    )


def rel(root: Path, path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return str(path)


def run_git_status(root: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "status", "--short"],
            cwd=root,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
    except FileNotFoundError as exc:
        raise ReleaseError("git was not found; cannot inspect repository state.") from exc
    if result.returncode != 0:
        raise ReleaseError(f"git status failed: {result.stderr.strip()}")
    return result.stdout.strip()


def read_utf8(path: Path) -> str:
    if not path.exists():
        raise ReleaseError(f"Required file does not exist: {path}")
    if not path.is_file():
        raise ReleaseError(f"Required path is not a regular file: {path}")
    if path.stat().st_size == 0:
        raise ReleaseError(f"Required file is empty: {path}")
    try:
        with path.open("r", encoding="utf-8", newline="") as handle:
            return handle.read()
    except UnicodeDecodeError as exc:
        raise ReleaseError(f"File is not valid UTF-8: {path}") from exc


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def validate_control_chars(text: str, label: str) -> None:
    for index, char in enumerate(text):
        code = ord(char)
        if code < 32 and char not in "\t\n\r":
            raise ReleaseError(f"{label} contains disallowed control character U+{code:04X} at offset {index}.")


def validate_html_structure(html: str) -> None:
    lower = html.lower()
    checks = [
        ("<!doctype html", "<!DOCTYPE html>"),
        ("<html", "<html>"),
        ("<head", "<head>"),
        ("<body", "<body>"),
        ("</html>", "</html>"),
        ("<script", "<script>"),
        ("<title", "<title>"),
    ]
    missing = [label for needle, label in checks if needle not in lower]
    if missing:
        raise ReleaseError("HTML structure check failed. Missing: " + ", ".join(missing))
    validate_control_chars(html, "HTML")


def validate_required_markers(html: str) -> None:
    missing = [marker for marker in REQUIRED_MARKERS if marker not in html]
    if missing:
        raise ReleaseError("Required Cloud Edition markers are missing: " + ", ".join(missing))


def extract_supabase_config_block(html: str) -> str:
    match = re.search(r"const\s+SPLAY_SUPABASE_CONFIG\s*=\s*\{(?P<body>.*?)\}\s*;", html, re.DOTALL)
    if not match:
        raise ReleaseError("SPLAY_SUPABASE_CONFIG object was not found.")
    return match.group("body")


def extract_supabase_value(config_block: str, key: str) -> str:
    pattern = re.compile(rf"\b{re.escape(key)}\s*:\s*(['\"])(.*?)\1", re.DOTALL)
    matches = pattern.findall(config_block)
    if len(matches) != 1:
        raise ReleaseError(f"Supabase config value {key!r} must appear exactly once.")
    return matches[0][1].strip()


def validate_supabase_public_config(html: str) -> None:
    if "SPLAY_SUPABASE_CONFIG" not in html:
        raise ReleaseError("SPLAY_SUPABASE_CONFIG is missing.")
    config_block = extract_supabase_config_block(html)
    url = extract_supabase_value(config_block, "url")
    key = extract_supabase_value(config_block, "publishableKey")
    if not url or url == "YOUR_SUPABASE_URL" or "YOUR_SUPABASE_URL" in url:
        raise ReleaseError("Supabase URL is not configured.")
    if not key or key == "YOUR_SUPABASE_PUBLISHABLE_KEY" or "YOUR_SUPABASE_PUBLISHABLE_KEY" in key:
        raise ReleaseError("Supabase publishable key is not configured.")
    if not re.match(r"^https://[A-Za-z0-9.-]+\.supabase\.co/?$", url):
        raise ReleaseError("Supabase URL does not look like a public Supabase project URL.")
    if re.search(r"service_role|secret", key, re.IGNORECASE):
        raise ReleaseError("Publishable key field appears to contain a secret/service role key.")
    service_role_mentions = len(re.findall(r"service_role", html, re.IGNORECASE))
    if service_role_mentions > 1:
        raise ReleaseError("Secret pattern detected: service_role")
    for name, pattern in SECRET_PATTERNS:
        if pattern.search(html):
            raise ReleaseError(f"Secret pattern detected: {name}")


def extract_inline_javascript(html: str) -> str:
    parser = InlineScriptExtractor()
    parser.feed(html)
    if not parser.scripts:
        raise ReleaseError("No executable inline JavaScript was found.")
    return "\n".join(parser.scripts)


def run_node_check(script: str, work_dir: Path, label: str) -> None:
    node = shutil.which("node")
    if node is None:
        raise ReleaseError("node was not found; JavaScript syntax check cannot be completed.")
    temp_path = work_dir / f".release_check_{label}.tmp.js"
    try:
        temp_path.write_text(script, encoding="utf-8", newline="\n")
        result = subprocess.run(
            [node, "--check", str(temp_path)],
            cwd=work_dir,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if result.returncode != 0:
            output = (result.stdout + result.stderr).strip()
            raise ReleaseError(f"node --check failed for {label}:\n{output}")
    finally:
        try:
            temp_path.unlink()
        except FileNotFoundError:
            pass


def replace_exactly_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise ReleaseError(f"Expected release transform source to appear exactly once, found {count}: {old}")
    return text.replace(old, new, 1)


def extract_version(html: str) -> str:
    match = re.search(r"\bversion\s*:\s*['\"]([^'\"]+)['\"]", html)
    return match.group(1) if match else "unknown"


def build_stable_html(preview_html: str) -> tuple[str, list[str]]:
    html = preview_html
    transformations: list[str] = []
    html = replace_exactly_once(html, TITLE_PREVIEW, TITLE_STABLE)
    transformations.append("preview title -> stable title")
    html = replace_exactly_once(html, STORAGE_PREVIEW, STORAGE_STABLE)
    transformations.append("preview STORAGE_KEY -> stable STORAGE_KEY")
    html = replace_exactly_once(html, SOURCE_PREVIEW, SOURCE_STABLE)
    transformations.append("stable SOURCE_STORAGE_KEY -> preview migration source")
    return html, transformations


def validate_preview_html(html: str) -> None:
    validate_html_structure(html)
    validate_required_markers(html)
    validate_supabase_public_config(html)
    validate_control_chars(extract_inline_javascript(html), "Preview JavaScript")


def validate_stable_html(html: str) -> None:
    validate_html_structure(html)
    validate_required_markers(html)
    validate_supabase_public_config(html)
    js = extract_inline_javascript(html)
    validate_control_chars(js, "Stable JavaScript")
    if TITLE_PREVIEW in html:
        raise ReleaseError("Preview title remains in stable HTML.")
    if html.count(STORAGE_STABLE) != 1:
        raise ReleaseError("Stable STORAGE_KEY must appear exactly once.")
    if html.count(SOURCE_STABLE) != 1:
        raise ReleaseError("Stable SOURCE_STORAGE_KEY must appear exactly once.")
    if html.count(CLOUD_CACHE_PREFIX) != 1:
        raise ReleaseError("Cloud cache prefix was changed or duplicated.")


def load_existing(paths: ReleasePaths) -> ExistingState:
    stable_bytes = paths.stable.read_bytes() if paths.stable.exists() else None
    docs_bytes = paths.public.read_bytes() if paths.public.exists() else None
    manifest_bytes = paths.manifest.read_bytes() if paths.manifest.exists() else None
    return ExistingState(
        stable_exists=stable_bytes is not None,
        docs_exists=docs_bytes is not None,
        manifest_exists=manifest_bytes is not None,
        stable_sha256=sha256_bytes(stable_bytes) if stable_bytes is not None else None,
        docs_sha256=sha256_bytes(docs_bytes) if docs_bytes is not None else None,
        manifest_sha256=sha256_bytes(manifest_bytes) if manifest_bytes is not None else None,
        stable_bytes=stable_bytes,
        docs_bytes=docs_bytes,
        manifest_bytes=manifest_bytes,
    )


def planned_archive_path(paths: ReleasePaths, existing: ExistingState, new_sha: str) -> Path | None:
    if not existing.stable_exists or existing.stable_sha256 == new_sha:
        return None
    timestamp = datetime.now().astimezone().strftime("%Y%m%d_%H%M%S")
    short_sha = (existing.stable_sha256 or "unknown")[:12]
    return paths.archive_dir / f"splay_os_{timestamp}_{short_sha}.html"


def archive_existing_stable(paths: ReleasePaths, existing: ExistingState, archive_path: Path | None) -> Path | None:
    if archive_path is None:
        return None
    if existing.stable_bytes is None or existing.stable_sha256 is None:
        return None
    paths.archive_dir.mkdir(parents=True, exist_ok=True)
    candidate = archive_path
    suffix = 1
    while candidate.exists():
        candidate = archive_path.with_name(f"{archive_path.stem}_{suffix}{archive_path.suffix}")
        suffix += 1
    candidate.write_bytes(existing.stable_bytes)
    if sha256_file(candidate) != existing.stable_sha256:
        try:
            candidate.unlink()
        finally:
            raise ReleaseError("Archive SHA256 does not match the existing stable file.")
    return candidate


def write_temp(path: Path, data: bytes) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.parent / f".{path.name}.tmp.{os.getpid()}"
    with temp_path.open("wb") as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    return temp_path


def atomic_write(path: Path, data: bytes) -> None:
    temp_path = write_temp(path, data)
    try:
        os.replace(temp_path, path)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def restore_path(path: Path, existed: bool, data: bytes | None) -> None:
    if existed:
        if data is None:
            raise ReleaseError(f"Cannot restore missing backup for {path}")
        atomic_write(path, data)
    else:
        try:
            path.unlink()
        except FileNotFoundError:
            pass


def atomic_replace_many(replacements: dict[Path, bytes], backups: dict[Path, tuple[bool, bytes | None]]) -> None:
    temp_paths: dict[Path, Path] = {}
    replaced: list[Path] = []
    try:
        for path, data in replacements.items():
            temp_paths[path] = write_temp(path, data)
        for path, temp_path in temp_paths.items():
            os.replace(temp_path, path)
            replaced.append(path)
    except Exception as exc:
        for temp_path in temp_paths.values():
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass
        for path in reversed(replaced):
            existed, data = backups[path]
            restore_path(path, existed, data)
        raise ReleaseError(f"Atomic output update failed and previous outputs were restored: {exc}") from exc
    finally:
        for temp_path in temp_paths.values():
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass


def make_manifest(paths: ReleasePaths, build: ReleaseBuild, archive: Path | None) -> bytes:
    manifest = {
        "released_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": rel(paths.root, paths.preview),
        "stable": rel(paths.root, paths.stable),
        "public": rel(paths.root, paths.public),
        "version": build.version,
        "source_sha256": build.source_sha256,
        "stable_sha256": build.stable_sha256,
        "docs_sha256": build.docs_sha256,
        "archive": rel(paths.root, archive),
        "transformations": build.transformations,
    }
    return (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def build_release(paths: ReleasePaths) -> ReleaseBuild:
    preview_html = read_utf8(paths.preview)
    validate_preview_html(preview_html)
    preview_js = extract_inline_javascript(preview_html)
    run_node_check(preview_js, paths.root, "preview")
    stable_html, transformations = build_stable_html(preview_html)
    validate_stable_html(stable_html)
    stable_js = extract_inline_javascript(stable_html)
    run_node_check(stable_js, paths.root, "stable_prewrite")
    source_bytes = preview_html.encode("utf-8")
    stable_bytes = stable_html.encode("utf-8")
    return ReleaseBuild(
        preview_html=preview_html,
        stable_html=stable_html,
        transformations=transformations,
        version=extract_version(preview_html),
        source_sha256=sha256_bytes(source_bytes),
        stable_sha256=sha256_bytes(stable_bytes),
        docs_sha256=sha256_bytes(stable_bytes),
    )


def git_output_targets_modified(git_status: str) -> list[str]:
    targets = {"release/stable/splay_os.html", "docs/index.html", "release/manifest.json"}
    modified: list[str] = []
    for line in git_status.splitlines():
        path = line[3:].replace("\\", "/") if len(line) > 3 else ""
        if path in targets:
            modified.append(line)
    return modified


def confirm_release(paths: ReleasePaths, archive: Path | None) -> None:
    print()
    print("Release preview to stable and docs?")
    print()
    print("Source:")
    print(f"  {rel(paths.root, paths.preview)}")
    print()
    print("Targets:")
    print(f"  {rel(paths.root, paths.stable)}")
    print(f"  {rel(paths.root, paths.public)}")
    print()
    print("Archive:")
    print(f"  {rel(paths.root, archive) if archive else 'none'}")
    print()
    answer = input("Type YES to continue: ")
    if answer != "YES":
        raise ReleaseError("Release cancelled.")


def legacy_docs_warnings(paths: ReleasePaths) -> list[str]:
    warnings: list[str] = []
    legacy_preview = paths.root / "docs" / "splay_os_preview.html"
    if legacy_preview.exists():
        warnings.append(f"Legacy preview file remains: {rel(paths.root, legacy_preview)}")
    return warnings


def print_plan(paths: ReleasePaths, build: ReleaseBuild, existing: ExistingState, archive_plan: Path | None, git_status: str, dry_run: bool) -> None:
    log("ROOT", str(paths.root))
    log("SOURCE", rel(paths.root, paths.preview) or str(paths.preview))
    log("STABLE", rel(paths.root, paths.stable) or str(paths.stable))
    log("PUBLIC", rel(paths.root, paths.public) or str(paths.public))
    log("GIT", git_status if git_status else "clean")
    log("CHECK", "HTML structure: OK")
    log("CHECK", "Required functions: OK")
    log("CHECK", "Supabase URL: configured")
    log("CHECK", "Publishable Key: configured")
    log("CHECK", "Secret key patterns: not detected")
    log("CHECK", "Preview JavaScript: OK")
    log("TRANSFORM", "; ".join(build.transformations))
    log("SHA256", f"preview {build.source_sha256}")
    log("SHA256", f"stable {build.stable_sha256}")
    log("ARCHIVE", rel(paths.root, archive_plan) if archive_plan else "none")
    if existing.stable_sha256:
        log("CURRENT", f"stable {existing.stable_sha256}")
    if existing.docs_sha256:
        log("CURRENT", f"docs {existing.docs_sha256}")
    for warning in legacy_docs_warnings(paths):
        log("WARN", warning)
    if dry_run:
        log("DRY-RUN", "No files will be written.")


def release(dry_run: bool, assume_yes: bool) -> int:
    print("=== Splay OS Release ===")
    root = resolve_project_root()
    paths = get_paths(root)
    git_status = run_git_status(root)
    build = build_release(paths)
    existing = load_existing(paths)
    archive_plan = planned_archive_path(paths, existing, build.stable_sha256)
    print_plan(paths, build, existing, archive_plan, git_status, dry_run)

    no_changes = (
        existing.stable_sha256 == build.stable_sha256
        and existing.docs_sha256 == build.stable_sha256
        and paths.manifest.exists()
    )
    if no_changes:
        log("DONE", "No release changes detected.")
        return 0

    modified_outputs = git_output_targets_modified(git_status)
    if modified_outputs:
        log("WARN", "Output targets already have Git changes: " + "; ".join(modified_outputs))

    if dry_run:
        log("DONE", "Dry run completed successfully.")
        return 0

    if modified_outputs and not assume_yes:
        log("WARN", "The release will overwrite output targets with existing Git changes.")
    if not assume_yes:
        confirm_release(paths, archive_plan)

    archive_created: Path | None = None
    outputs_replaced = False
    backups: dict[Path, tuple[bool, bytes | None]] = {}
    try:
        archive_created = archive_existing_stable(paths, existing, archive_plan)
        if archive_created:
            log("ARCHIVE", rel(paths.root, archive_created) or str(archive_created))

        manifest_bytes = make_manifest(paths, build, archive_created)
        replacements = {
            paths.stable: build.stable_html.encode("utf-8"),
            paths.public: build.stable_html.encode("utf-8"),
            paths.manifest: manifest_bytes,
        }
        backups = {
            paths.stable: (existing.stable_exists, existing.stable_bytes),
            paths.public: (existing.docs_exists, existing.docs_bytes),
            paths.manifest: (existing.manifest_exists, existing.manifest_bytes),
        }
        atomic_replace_many(replacements, backups)
        outputs_replaced = True

        stable_sha = sha256_file(paths.stable)
        docs_sha = sha256_file(paths.public)
        if stable_sha != docs_sha:
            raise ReleaseError("stable and docs SHA256 do not match after write.")
        if stable_sha != build.stable_sha256:
            raise ReleaseError("stable SHA256 does not match generated release bytes.")
        stable_html_after = read_utf8(paths.stable)
        validate_stable_html(stable_html_after)
        run_node_check(extract_inline_javascript(stable_html_after), paths.root, "stable")
        docs_html_after = read_utf8(paths.public)
        validate_stable_html(docs_html_after)
        log("WRITE", rel(paths.root, paths.stable) or str(paths.stable))
        log("WRITE", rel(paths.root, paths.public) or str(paths.public))
        log("CHECK", "SHA256 match: OK")
        log("SHA256", f"stable {stable_sha}")
        log("SHA256", f"docs {docs_sha}")
        log("MANIFEST", rel(paths.root, paths.manifest) or str(paths.manifest))
        for warning in legacy_docs_warnings(paths):
            log("WARN", warning)
        log("DONE", "Release completed")
        return 0
    except Exception:
        if outputs_replaced:
            for path, (existed, data) in backups.items():
                try:
                    restore_path(path, existed, data)
                except Exception as restore_error:
                    print(f"[ERROR] Failed to restore {path}: {restore_error}", file=sys.stderr)
        if archive_created and archive_created.exists():
            try:
                archive_created.unlink()
            except OSError:
                pass
        raise


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Promote approved Splay OS preview to stable and GitHub Pages output.")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print the release plan without writing outputs.")
    parser.add_argument("--yes", action="store_true", help="Skip the final YES confirmation prompt.")
    return parser.parse_args(list(argv))


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        return release(dry_run=args.dry_run, assume_yes=args.yes)
    except ReleaseError as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("[ERROR] Release interrupted.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())