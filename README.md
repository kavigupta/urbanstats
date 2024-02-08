
# Urban Stats

A tool for viewing statistics of various areas in the United States. Currently live at [urbanstats.org](https://urbanstats.org/).


# Build instructions

Very incomplete, I started documenting this halfway through

```
conda install -c conda-forge cfgrib
pip install -r requirements.txt
cd react; npm i; cd ..
```

To just build the site javascript files, run

```
python create_website.py --no-data --no-geo --no-juxta
```
