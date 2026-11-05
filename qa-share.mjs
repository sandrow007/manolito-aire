export default async function run(page, ui) {
  // Cierra el aviso de cookies si está
  for (const sel of ['#cookie-aceptar', 'button[data-cookie="aceptar"]', '.cookie-btn-aceptar', '#btnAceptarCookies']) {
    const b = page.locator(sel).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => { }); break; }
  }
  // fallback: cualquier botón con texto Aceptar
  const aceptar = page.getByRole('button', { name: /acept|accept/i }).first();
  if (await aceptar.isVisible().catch(() => false)) await aceptar.click().catch(() => { });

  await page.waitForFunction(() => !!document.getElementById('rsMapControls'), null, { timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const b = document.getElementById('rsBtnCompartirPunto');
    if (b && !b.hidden) b.click();
  });
  await page.waitForTimeout(400);
  const panel = await page.locator('#rsSharePanel').boundingBox().catch(() => null);
  if (panel) {
    await page.screenshot({
      path: 'share-panel3.png', clip: {
        x: Math.max(0, panel.x - 60), y: Math.max(0, panel.y - 80),
        width: Math.min(950, panel.width + 120), height: panel.height + 140
      }
    });
  }
  return { panel };
}
