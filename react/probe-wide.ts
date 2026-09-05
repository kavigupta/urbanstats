import { defaultTypeEnvironment } from './src/mapper/context'
import { mapUSSFromString } from './src/mapper/settings/map-uss'
import { deriveMapLabel } from './src/urban-stats-script/derive-human-readable-name'
import { deriveMapUnit } from './src/urban-stats-script/derive-unit'
import { reifyString } from './src/utils/human-readable-name'
import { writeQuantity } from './src/utils/quantity'
const te = defaultTypeEnvironment('USA')
const codes = [
    'population', 'population / area', 'area ** 0.5', 'population * 2', '(population + population) / 2',
    'ln(population) * area', 'sqrt(area) + sqrt(area)', 'maximum(population, population)',
    'population / (area + area)', '(population + population) * (area / area)',
    'abs(high_temp - low_temp)', 'sum(population)', 'mean(density_pw_1km, weight=population)',
    'nanTo0(population)', 'population ** 2 / area', 'high_temp - low_temp',
    'if (population > 0) { area } else { area }', 'do { x = area; x }', '[area, area]',
    'population > 1000', 'commute_bike < 0.1', 'pres_2020_margin > 0.1',
    'density_pw_1km', 'rainfall * 2', 'inverseQuantile(population, population)',
]
for (const code of codes) {
    const uss = mapUSSFromString(`cMap(data=${code}, scale=linearScale(), ramp=rampUridis)`)
    let out: string
    try {
        const label = deriveMapLabel(uss, te)
        const unit = deriveMapUnit(uss, te)
        const written = unit === undefined ? 'nothing' : `${writeQuantity(1000, unit, {}, 'byItself').renderedValue}${reifyString(writeQuantity(1000, unit, {}, 'byItself').unitName, {})}`
        out = `${label === undefined ? 'NO LABEL' : reifyString(label, {})}   ||   ${written}`
    } catch (e) { out = `threw: ${(e as Error).message.slice(0, 50)}` }
    console.log(`${code}\t${out}`)
}
