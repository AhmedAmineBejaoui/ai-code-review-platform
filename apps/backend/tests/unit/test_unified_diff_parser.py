from __future__ import annotations

from app.core.review_engine.diff_engine import parse_unified_diff


def test_single_file_single_hunk_mapping():
    diff = "\n".join(
        [
            "diff --git a/app.py b/app.py",
            "index 1111111..2222222 100644",
            "--- a/app.py",
            "+++ b/app.py",
            "@@ -1,3 +1,4 @@ def run():",
            " import os",
            "-print('old')",
            "+print('new')",
            "+print('extra')",
            " return 1",
        ]
    )
    parsed = parse_unified_diff(diff)
    assert len(parsed.files) == 1
    file_diff = parsed.files[0]
    assert file_diff.path_new == "app.py"
    assert file_diff.change_type == "modified"
    assert len(file_diff.hunks) == 1
    hunk = file_diff.hunks[0]
    assert hunk.old_start == 1
    assert hunk.new_start == 1
    assert hunk.header == "def run():"
    assert any(line.line_type == "add" and line.old_line_no is None for line in hunk.lines)
    assert any(line.line_type == "remove" and line.new_line_no is None for line in hunk.lines)


def test_multi_file_diff_parsed():
    diff = "\n".join(
        [
            "diff --git a/a.py b/a.py",
            "--- a/a.py",
            "+++ b/a.py",
            "@@ -1 +1 @@",
            "-a = 1",
            "+a = 2",
            "diff --git a/b.py b/b.py",
            "--- a/b.py",
            "+++ b/b.py",
            "@@ -2,0 +3,1 @@",
            "+print('ok')",
        ]
    )
    parsed = parse_unified_diff(diff)
    assert len(parsed.files) == 2
    assert parsed.files[0].path_new == "a.py"
    assert parsed.files[1].path_new == "b.py"
    assert parsed.files[1].additions_count == 1


def test_rename_file_detected():
    diff = "\n".join(
        [
            "diff --git a/old_name.py b/new_name.py",
            "similarity index 100%",
            "rename from old_name.py",
            "rename to new_name.py",
        ]
    )
    parsed = parse_unified_diff(diff)
    assert len(parsed.files) == 1
    file_diff = parsed.files[0]
    assert file_diff.change_type == "renamed"
    assert file_diff.path_old == "old_name.py"
    assert file_diff.path_new == "new_name.py"


def test_new_file_mode_with_hunks():
    diff = "\n".join(
        [
            "diff --git a/new_file.py b/new_file.py",
            "new file mode 100644",
            "--- /dev/null",
            "+++ b/new_file.py",
            "@@ -0,0 +1,2 @@",
            "+line 1",
            "+line 2",
        ]
    )
    parsed = parse_unified_diff(diff)
    file_diff = parsed.files[0]
    assert file_diff.change_type == "added"
    assert file_diff.path_old is None
    assert file_diff.path_new == "new_file.py"
    assert file_diff.additions_count == 2


def test_deleted_file_mode_with_hunks():
    diff = "\n".join(
        [
            "diff --git a/legacy.py b/legacy.py",
            "deleted file mode 100644",
            "--- a/legacy.py",
            "+++ /dev/null",
            "@@ -1,2 +0,0 @@",
            "-line 1",
            "-line 2",
        ]
    )
    parsed = parse_unified_diff(diff)
    file_diff = parsed.files[0]
    assert file_diff.change_type == "deleted"
    # For deleted files parser keeps path_new usable for downstream mapping.
    assert file_diff.path_new == "legacy.py"
    assert file_diff.deletions_count == 2


def test_hunk_count_absent_defaults_to_one_and_line_numbers_progress():
    diff = "\n".join(
        [
            "diff --git a/main.py b/main.py",
            "--- a/main.py",
            "+++ b/main.py",
            "@@ -3 +3 @@",
            "-old",
            "+new",
        ]
    )
    parsed = parse_unified_diff(diff)
    hunk = parsed.files[0].hunks[0]
    assert hunk.old_lines == 1
    assert hunk.new_lines == 1
    remove_line = hunk.lines[0]
    add_line = hunk.lines[1]
    assert remove_line.old_line_no == 3
    assert remove_line.new_line_no is None
    assert add_line.old_line_no is None
    assert add_line.new_line_no == 3
