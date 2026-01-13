const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static('.'));

// Ensure downloads directory exists
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR);
}

app.get('/download', async (req, res) => {
    const videoUrl = req.query.url;
    const format = req.query.format || 'mp4';
    
    if (!videoUrl) {
        return res.status(400).send('URL is required');
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
        return res.status(400).send('Invalid YouTube URL');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const outputTemplate = path.join(DOWNLOADS_DIR, `${timestamp}_%(title)s.%(ext)s`);
    
    try {
        // Build yt-dlp command
        let command;
        
        if (format === 'mp3') {
            // Download as MP3
            command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputTemplate}" "${videoUrl}"`;
        } else {
            // Download as MP4
            command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputTemplate}" "${videoUrl}"`;
        }

        console.log('Executing:', command);

        exec(command, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Download error:', error);
                console.error('stderr:', stderr);
                return res.status(500).send('Download failed: ' + error.message);
            }

            // Find the downloaded file
            const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.startsWith(timestamp.toString()));
            
            if (files.length === 0) {
                return res.status(500).send('Downloaded file not found');
            }

            const downloadedFile = path.join(DOWNLOADS_DIR, files[0]);
            const fileName = files[0].replace(`${timestamp}_`, '');

            // Send file to user
            res.download(downloadedFile, fileName, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                }
                
                // Delete file after sending
                setTimeout(() => {
                    try {
                        fs.unlinkSync(downloadedFile);
                        console.log('Cleaned up:', downloadedFile);
                    } catch (e) {
                        console.error('Cleanup error:', e);
                    }
                }, 1000);
            });
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error: ' + error.message);
    }
});

// Check if yt-dlp is available
app.get('/health', (req, res) => {
    exec('yt-dlp --version', (error, stdout) => {
        if (error) {
            return res.json({ 
                status: 'error', 
                message: 'yt-dlp not found. Please install it.',
                help: 'Download from: https://github.com/yt-dlp/yt-dlp/releases'
            });
        }
        res.json({ 
            status: 'ok', 
            ytdlpVersion: stdout.trim(),
            message: 'Server ready to download videos!'
        });
    });
});

function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Checking yt-dlp availability...');
    
    exec('yt-dlp --version', (error, stdout) => {
        if (error) {
            console.error('⚠️  WARNING: yt-dlp not found!');
            console.error('Please install yt-dlp:');
            console.error('Windows: Download yt-dlp.exe from https://github.com/yt-dlp/yt-dlp/releases');
            console.error('Linux/Mac: pip install yt-dlp  OR  brew install yt-dlp');
        } else {
            console.log('✅ yt-dlp version:', stdout.trim());
            console.log('✅ Ready to download videos!');
        }
    });
});