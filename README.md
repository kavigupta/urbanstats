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

Create a `direnv` that uses the `virtualenv`

```
echo "source venv/bin/activate" > .envrc
direnv allow .
```

Install Python requirements:

```
pip install -r requirements.txt
```

You will want to clone the site repository to some location, using a shallow clone

```
git clone --depth 1 https://github.com/densitydb/densitydb.github.io.git
```

I assume you are placing the site repository in `~/densitydb.github.io` in the following commands:

Install Node requirements:
```
cd react
npm ci
```

(Use `npm i` for subsequent updates)

To develop on the site, run:

```
cd react
npm run watch ~/densitydb.github.io
```

Then you can then visit the site in your web browser at `http://localhost:8000/`.

The site will automatically reload when you make changes to TypeScript files.

You may need to restart the command when changing other files or pulling from `origin`.

# Frontend Developer Flow

Make your changes using `npm run watch`.

Run `npm run lint` to automatically correct any lint issues.

Manually correct remaining lint issues.

Push your branch to Github. If changes on the frontend depend on changes on the backend, you'll need to create a branch with the same name on https://github.com/densitydb/densitydb.github.io. The build system will pick up the same branch names and run the automated pipelines based on the same backend branch name.

Correct any failing checks.

Create a PR for your branch.
