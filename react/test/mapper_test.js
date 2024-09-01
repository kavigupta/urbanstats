
import { TARGET, download_or_check_string, most_recent_download_path, screencap } from './test_utils';

const fs = require('fs');

function check_geojson(t, path) {
    download_or_check_string(t, fs.readFileSync(most_recent_download_path(), 'utf8'), path);
}

fixture('mapping')
    .page(TARGET + '/mapper.html?settings=H4sIAAAAAAAAA1WOzQ6CQAyEX8XUeCOGixeO%2BggejSEFy7Kh%2B5PdRSWEd7dLjMHe2plvpjMociqg76d60PYBFVwTJoICOs2JAlQzkMWGSbQOOZIoo22TdjZrafIk0O9UwBODzv4I1e2%2BLAW0jl2oo8RugKitYlrtPObDmbEddgcQIKDxGytrSxjgG2Rwq%2FlAkZJoFk3eL2NDPbF%2BQ27OpBRPUiTIiotnX64j0Iu06uWr8ngSd4OR%2FtNdNJLzAd2YY7skAQAA')
    // no local storage
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test("state-map", async t => {
    await screencap(t, "state-map");
    await check_geojson(t, "state-map-geojson");
})

fixture('mapping-more-complex')
    .page(TARGET + '/mapper.html?settings=H4sIAAAAAAAAA5WSwW6DMAyGXwV5l3ZqJ8ax10o797DbVCFDDUQLSeSErqjqu88BRpm0wyokhH7bn3%2FbXKEmWzO6ps8%2FlTnBDva2M6GHDVRKB2LYXYEMFpokWKH2JJHOlEFZE2OhdyRVs3S7baC02nLuA4a%2FMjZwRt1F6W0psYpNPOw%2BrmCwjfGLBOjieEHxytSaFoyDdZ3GSEn2DZqaklWWvqbbLM3SdXQz09xjtAETCcexjLwfRgZKtsnqkjwnbi2VE7xR8s1UT2njGLJQciQvE%2F7XFGR5c8nIeMDpcVhjLhbUacgZ8zlXRg5ZkhMXUExaaamqVKmmRtCClH%2BRqpuQF33u7p7Gq9%2BO4o2xdYtJtDKEDNPBW1zG4sIo3Bf0TsyohgmZzsQ%2B%2Fk%2BBOxIhcuR36WVAAQwwqXgq0vjAjy2R0pcsAgr09Lub9a1c6htvmskEzgIAAA%3D%3D')
    // no local storage
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test("mapping-more-complex", async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload(true));
    await t.wait(5000);
    await screencap(t, "mapping-more-complex");
    await check_geojson(t, "mapping-more-complex-geojson");
})
