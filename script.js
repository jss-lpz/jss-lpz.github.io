class VideoMirror {
            constructor() {
                this.video = document.getElementById('videoElement');
                this.canvas = document.getElementById('canvas');
                this.ctx = this.canvas.getContext('2d');
                this.status = document.getElementById('status');
                this.stream = null;
                this.animationId = null;
                this.currentFilter = 'normal';
                
                this.initializeButtons();
            }

            initializeButtons() {
                document.getElementById('startBtn').addEventListener('click', () => this.startCamera());
                document.getElementById('stopBtn').addEventListener('click', () => this.stopCamera());
                document.getElementById('normalBtn').addEventListener('click', () => this.setFilter('normal'));
                document.getElementById('grayscaleBtn').addEventListener('click', () => this.setFilter('grayscale'));
                document.getElementById('sepiaBtn').addEventListener('click', () => this.setFilter('sepia'));
                document.getElementById('blurBtn').addEventListener('click', () => this.setFilter('blur'));
                document.getElementById('edgeBtn').addEventListener('click', () => this.setFilter('edge'));
            }

            async startCamera() {
                try {
                    this.updateStatus('Requesting camera access...');
                    
                    const constraints = {
                        video: {
                            width: { ideal: 640 },
                            height: { ideal: 480 },
                            facingMode: 'user'
                        },
                        audio: false
                    };

                    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
                    this.video.srcObject = this.stream;
                    
                    this.video.onloadedmetadata = () => {
                        this.canvas.width = this.video.videoWidth;
                        this.canvas.height = this.video.videoHeight;
                        this.startProcessing();
                    };

                    this.updateStatus('Camera started! Try different effects below.');
                    this.updateButtons(true);

                } catch (error) {
                    console.error('Error accessing camera:', error);
                    this.updateStatus(`Error: ${error.message}`, true);
                }
            }

            stopCamera() {
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }
                
                if (this.animationId) {
                    cancelAnimationFrame(this.animationId);
                    this.animationId = null;
                }

                this.video.srcObject = null;
                this.video.style.display = 'block';
                this.canvas.style.display = 'none';
                
                this.updateStatus('Camera stopped');
                this.updateButtons(false);
            }

            startProcessing() {
                const processFrame = () => {
                    if (this.video.readyState === 4) {
                        this.applyFilter();
                    }
                    this.animationId = requestAnimationFrame(processFrame);
                };
                processFrame();
            }

            applyFilter() {
                this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                
                if (this.currentFilter !== 'normal') {
                    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    const filteredData = this.processImageData(imageData);
                    this.ctx.putImageData(filteredData, 0, 0);
                }
            }

            processImageData(imageData) {
                const data = imageData.data;
                
                switch (this.currentFilter) {
                    case 'grayscale':
                        for (let i = 0; i < data.length; i += 4) {
                            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                            data[i] = gray;
                            data[i + 1] = gray;
                            data[i + 2] = gray;
                        }
                        break;
                        
                    case 'sepia':
                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];
                            
                            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                        }
                        break;
                        
                    case 'edge':
                        return this.edgeDetection(imageData);
                }
                
                return imageData;
            }

            edgeDetection(imageData) {
                const data = imageData.data;
                const width = imageData.width;
                const height = imageData.height;
                const output = new ImageData(width, height);
                
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const idx = (y * width + x) * 4;
                        
                        const tl = data[((y - 1) * width + (x - 1)) * 4];
                        const tm = data[((y - 1) * width + x) * 4];
                        const tr = data[((y - 1) * width + (x + 1)) * 4];
                        const ml = data[(y * width + (x - 1)) * 4];
                        const mm = data[idx];
                        const mr = data[(y * width + (x + 1)) * 4];
                        const bl = data[((y + 1) * width + (x - 1)) * 4];
                        const bm = data[((y + 1) * width + x) * 4];
                        const br = data[((y + 1) * width + (x + 1)) * 4];
                        
                        const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
                        const gy = -tl - 2 * tm - tr + bl + 2 * bm + br;
                        const g = Math.sqrt(gx * gx + gy * gy);
                        
                        output.data[idx] = g;
                        output.data[idx + 1] = g;
                        output.data[idx + 2] = g;
                        output.data[idx + 3] = 255;
                    }
                }
                
                return output;
            }

            setFilter(filter) {
                this.currentFilter = filter;
                
                // Update button states
                document.querySelectorAll('.controls .btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.getElementById(filter + 'Btn').classList.add('active');
                
                if (filter === 'normal') {
                    this.video.style.display = 'block';
                    this.canvas.style.display = 'none';
                    this.video.style.filter = '';
                } else if (filter === 'blur') {
                    this.video.style.display = 'block';
                    this.canvas.style.display = 'none';
                    this.video.style.filter = 'blur(5px)';
                } else {
                    this.video.style.display = 'none';
                    this.canvas.style.display = 'block';
                    this.canvas.style.transform = 'scaleX(-1)';
                }
            }

            updateStatus(message, isError = false) {
                this.status.textContent = message;
                this.status.className = isError ? 'status error' : 'status';
            }

            updateButtons(cameraActive) {
                document.getElementById('startBtn').disabled = cameraActive;
                document.getElementById('stopBtn').disabled = !cameraActive;
                
                const filterButtons = ['normalBtn', 'grayscaleBtn', 'sepiaBtn', 'blurBtn', 'edgeBtn'];
                filterButtons.forEach(btnId => {
                    document.getElementById(btnId).disabled = !cameraActive;
                });
            }
        }

        // Initialize the demo when the page loads
        document.addEventListener('DOMContentLoaded', () => {
            new VideoMirror();
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && window.videoMirror) {
                // Optionally pause processing when tab is hidden
            }
        }
);
