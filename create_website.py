import argparse

from urbanstats.website_data.build import BUILD_STEPS, build_urbanstats


def _resolve_steps(step_names):
    """Normalize step names to canonical set (lowercase)."""
    return {n.strip().lower() for n in step_names}


def main():
    parser = argparse.ArgumentParser(
        description="Build the Urban Stats website.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--mode",
        required=True,
        choices=("dev", "prod", "ci"),
        help="Build mode",
    )
    parser.add_argument(
        "--site-folder",
        required=True,
        help="Output directory for the built site",
    )

    steps_help = ", ".join(sorted(BUILD_STEPS))
    parser.add_argument(
        "--target",
        required=True,
        choices=("all", "scripts"),
        help=f"all: full build (steps: {steps_help}). scripts: scripts-only; use --and to add steps.",
    )

    parser.add_argument(
        "--and",
        dest="and_steps",
        metavar="STEP",
        nargs="+",
        default=[],
        choices=BUILD_STEPS,
        help=f"With --target scripts: steps to add. Valid: {steps_help}",
    )

    args = parser.parse_args()

    steps = {"all": set(BUILD_STEPS), "scripts": set()}[args.target]
    steps.update(_resolve_steps(args.and_steps))
    assert steps.issubset(BUILD_STEPS), f"Invalid steps: {steps - BUILD_STEPS}"

    build_urbanstats(args.site_folder, mode=args.mode, steps=steps)


if __name__ == "__main__":
    main()
