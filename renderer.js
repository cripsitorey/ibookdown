document.getElementById('startButton').addEventListener('click', () => {
  const url = document.getElementById('urlInput').value;
  const nextButtonSelector = document.getElementById('selectorInput').value;

  if (!url || !nextButtonSelector) {
    alert('Por favor ingresa una URL y un selector válidos.');
    return;
  }

  console.log(`Iniciando descarga con URL: ${url} y selector: ${nextButtonSelector}`);
  window.api.send('start-download', { url, nextButtonSelector });
});

window.api.receive('download-complete', (args) => {
  if (args.success) {
    alert(`¡Descarga completada! PDF guardado en: ${args.pdfPath}`);
  } else {
    alert(`Error durante la descarga: ${args.error}`);
  }
});

window.api.receive('update-available', () => {
  alert('¡Nueva actualización disponible! Se está descargando.');
});

window.api.receive('update-downloaded', () => {
  const userConfirmed = confirm('¡Actualización descargada! ¿Deseas reiniciar la aplicación para instalarla?');
  if (userConfirmed) {
    window.api.send('restart-to-update');
  }
});

