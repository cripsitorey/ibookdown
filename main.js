const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();

  ipcMain.on('start-download', async (event, args) => {
    console.log('Descarga iniciada:', args);

    const puppeteer = require('puppeteer');
    const fs = require('fs');
    const { PDFDocument } = require('pdf-lib');
    const axios = require('axios');
    const outputDir = path.join(__dirname, 'downloads');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    let browser;
    try {
      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(args.url);

      const imageUrls = new Set();

      // Interceptar solicitudes de imágenes
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.resourceType() === 'image') {
          console.log(`Interceptada URL de imagen: ${request.url()}`);
          imageUrls.add(request.url());
        }
        request.continue();
      });

      // Lógica de navegación
      let hasNextPage = true;
      while (hasNextPage) {
        try {
          const nextButton = await page.$(args.nextButtonSelector);
          if (!nextButton) {
            console.log('Botón "Siguiente" no encontrado. Finalizando navegación.');
            hasNextPage = false;
            break;
          }

          console.log('Haciendo clic en el botón "Siguiente"...');
          await nextButton.click();
          // await page.waitForTimeout(1000);
        } catch (error) {
          console.log('Error durante la navegación:', error.message);
          hasNextPage = false;
        }
      }

      await browser.close();

      // Validar URLs capturadas
      console.log('URLs de imágenes capturadas:', [...imageUrls]);

      // Descargar imágenes
      const imagePaths = [];
      for (const [index, url] of [...imageUrls].entries()) {
        try {
          console.log(`Descargando imagen: ${url}`);
          const imagePath = path.join(outputDir, `page-${index + 1}.jpg`);
          const response = await axios({ url, responseType: 'stream' });

          await new Promise((resolve, reject) => {
            const stream = fs.createWriteStream(imagePath);
            response.data.pipe(stream);
            stream.on('finish', resolve);
            stream.on('error', reject);
          });

          console.log(`Imagen guardada en: ${imagePath}`);
          imagePaths.push(imagePath);
        } catch (error) {
          console.error(`Error descargando la imagen ${url}: ${error.message}`);
        }
      }

      // Crear el PDF
      const pdfDoc = await PDFDocument.create();
      for (const imagePath of imagePaths) {
        const jpgImageBytes = fs.readFileSync(imagePath);
        const jpgImage = await pdfDoc.embedJpg(jpgImageBytes);
        const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
        page.drawImage(jpgImage, { x: 0, y: 0 });
      }
      const pdfBytes = await pdfDoc.save();
      const pdfPath = path.join(outputDir, 'book.pdf');
      fs.writeFileSync(pdfPath, pdfBytes);

      event.reply('download-complete', { success: true, pdfPath });
    } catch (error) {
      if (browser) await browser.close();
      event.reply('download-complete', { success: false, error: error.message });
    }
  });
});
