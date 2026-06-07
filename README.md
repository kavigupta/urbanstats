# urbanstats

A tool for viewing statistics of various areas in the United States.

Currently lives at [urbanstats.org](https://urbanstats.org/).

# Build instructions

Install

```
sudo apt-get install libhdf5-serial-dev netcdf-bin libnetcdf-dev
```

Install `direnv`, and add it to your shell. https://direnv.net

Install `virtualenv`, https://virtualenv.pypa.io/en/latest/installation.html

Create a `virtualenv` for urbanstats:

```
cd urbanstats
virtualenv venv -p 3.10
```

If you get an error like `RuntimeError: failed to find interpreter for Builtin discover of python_spec='3.10'`, you may need to [install python3.10 first](https://gist.github.com/rutcreate/c0041e842f858ceb455b748809763ddb). Don't link it over your system version of python, `virtualenv` will pick it up once your run `apt install python3.10...`.

Create a `direnv` that uses the `virtualenv`

```
echo "source venv/bin/activate" > .envrc
direnv allow .
```

Install Python requirements (This has been tested on Python 3.10):

```
pip install -r requirements.txt
pip install -r requirements_torch.txt
```

You will want to clone the site repository to some location, using a shallow clone

```
git clone --depth 1 https://github.com/densitydb/densitydb.github.io.git
```

Ensure that you have Node version 20 or greater installed. https://nodejs.org/en/download

I assume you are placing the site repository in `~/densitydb.github.io` in the following commands:

To develop on the site, run:

```
cd react
npm run watch ~/densitydb.github.io
```

This automatically installs and updates node modules.

Then you can then visit the site in your web browser at `http://localhost:8000/`.

The site will automatically reload when you make changes to TypeScript files.

You may need to restart the command when changing other files or pulling from `origin`.

# Repository Setup

After cloning, run these commands to enable the pixel-aware PNG merge driver:

```
git config merge.png-merge.name "PNG pixel-aware merge"
git config merge.png-merge.driver "python3 scripts/png_merge.py %O %A %B"
```

# Frontend Developer Flow

Make your changes using `npm run watch`.

Run `npm run lint` to automatically correct any lint issues.

Manually correct remaining lint issues.

Push your branch to Github. If changes on the frontend depend on changes on the backend, you'll need to create a branch with the same name on https://github.com/densitydb/densitydb.github.io. The build system will pick up the same branch names and run the automated pipelines based on the same backend branch name.

Correct any failing checks.

Create a PR for your branch.

# Running Multiple Urban Stats Frontends at Once

Make a second copy of `urbanstats`, e.g. `urbanstats2`. (Potentially via git worktrees or other means)

Follow the repo setup instructions above again for the new copy.

Make a second copy of `~/densitydb.github.io`, e.g. `~/densitydb.github.io.2`.

Add `PORT` and `TESTCAFE_PORT` environment variables to `.envrc` in `urbanstats2` that are different from the defaults:

```
source venv/bin/activate
export PORT=8001 # Default 8000
export TESTCAFE_PORT=1339 # Default 1337, TestCafe takes two ports
```

You'll need to run `direnv allow` again.

Now, you can run your second copy, accessible on port `8001`:

```
cd react
npm run watch ~/densitydb.github.io.2
```
