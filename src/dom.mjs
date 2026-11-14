
const $ = id => document.getElementById(id);
let random = Math.random;
function withSeed(seed,create) {
  const original = random;
  random = ()=>{
    seed = (Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
  try { return create(); } finally { random = original; }
}
const pick = values => values[Math.floor(random() * values.length)];
function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function options(values, label, initial='') {
  const input = document.createElement('select');
  input.setAttribute('aria-label',label);
  input.add(new Option('Elegí…',''));
  for (const [value,name] of values) input.add(new Option(name,value));
  input.value = initial;
  return input;
}

export { $, pick, shuffle, options, withSeed };
