
# urbanstats

A tool for viewing statistics of various areas in the United States.

Currently live at [urbanstats.org](https://urbanstats.org/).


# Build instructions

Very incomplete, I started documenting this halfway through

```
conda install -c conda-forge cfgrib
pip install -r requirements.txt
cd react; npm i; cd ..
```

You will want to clone the site repository to some location, using a shallow clone

```
git clone --depth 1 git@github.com:densitydb/densitydb.github.io.git
```

I assume you are placing the site repository in `~/temp/site` in the following commands.

To just build the site javascript files, run

```
python create_website.py ~/temp/site --no-data --no-geo --no-juxta
```

Then you can serve the site by running

```
cd ~/temp/site; python -m http.server
```
