"""
autoresearch/run_loop.py
========================
Runs the full autoresearch loop: N experiments, each picking the next
best config automatically based on the leaderboard.

Usage:
  python autoresearch/run_loop.py --runs 20
  python autoresearch/run_loop.py --runs 10 --start 5  # continue from run 5

Each run auto-commits to git with the result summary as the commit message.
"""

import subprocess
import argparse
import json
from pathlib import Path

RESULTS_DIR = Path(__file__).parent / "results"


def git_commit(run_id: int, result_file: Path):
    """Commit the result JSON for this run."""
    result = json.loads(result_file.read_text())
    msg = (
        f"run {run_id:03d}: AUC={result['auc_cv']:.4f} "
        f"rho={result.get('spearman_rho') or 'N/A'} "
        f"feat={result['feature_set']} model={result['model']}"
    )
    try:
        subprocess.run(["git", "add", str(result_file), str(RESULTS_DIR / "leaderboard.csv")],
                       cwd=Path(__file__).parent.parent, check=True)
        subprocess.run(["git", "commit", "-m", msg],
                       cwd=Path(__file__).parent.parent, check=True)
        print(f"  [git] Committed: {msg}")
    except subprocess.CalledProcessError as e:
        print(f"  [git] Commit failed (non-fatal): {e}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs",  type=int, default=10, help="Number of experiment runs")
    parser.add_argument("--start", type=int, default=1,  help="Starting run ID")
    parser.add_argument("--no-git", action="store_true", help="Skip git commits")
    args = parser.parse_args()

    for i in range(args.start, args.start + args.runs):
        print(f"\n\n{'#'*60}")
        print(f"  AUTORESEARCH LOOP — Run {i} of {args.start + args.runs - 1}")
        print(f"{'#'*60}")

        ret = subprocess.run(
            ["python", "autoresearch/research.py", f"--run={i}", "--improve"],
            cwd=Path(__file__).parent.parent,
        )

        if ret.returncode != 0:
            print(f"\n  [ERROR] Run {i} failed with code {ret.returncode}. Stopping.")
            break

        result_file = RESULTS_DIR / f"run_{i:03d}.json"
        if not args.no_git and result_file.exists():
            git_commit(i, result_file)

    print(f"\n\n{'#'*60}")
    print(f"  LOOP COMPLETE")
    if (RESULTS_DIR / "leaderboard.csv").exists():
        import pandas as pd
        lb = pd.read_csv(RESULTS_DIR / "leaderboard.csv")
        print(f"\n  Top 5 runs:")
        print(lb.head(5)[["run", "auc_cv", "auc_test", "spearman_rho",
                           "feature_set", "model", "sensitivity", "specificity"]].to_string(index=False))
    print(f"{'#'*60}\n")


if __name__ == "__main__":
    main()
