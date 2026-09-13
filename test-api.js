/* eslint-disable @typescript-eslint/no-require-imports */
const https = require('https');

https.get('https://br.openfoodfacts.org/cgi/search.pl?search_terms=aveia&search_simple=1&action=process&json=1&page_size=5', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    console.log(`Found ${parsed.count} products.`);
    parsed.products.slice(0, 2).forEach(p => {
      console.log(`\nProduct: ${p.product_name} (${p.brands})`);
      console.log(`Nutriments (per 100g):`);
      console.log(` - Energy (kcal): ${p.nutriments['energy-kcal_100g']}`);
      console.log(` - Carbs (g): ${p.nutriments.carbohydrates_100g}`);
      console.log(` - Proteins (g): ${p.nutriments.proteins_100g}`);
      console.log(` - Fat (g): ${p.nutriments.fat_100g}`);
    });
  });
}).on('error', err => console.log('Error:', err.message));
