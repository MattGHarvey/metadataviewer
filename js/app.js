// EXIF Metadata Viewer - Main Application JavaScript
// =====================================================

// Load Google Analytics if available
fetch("ga-snippet.html")
	.then((response) => (response.ok ? response.text() : ""))
	.then((html) => {
		if (html) {
			const gaDiv = document.createElement("div");
			gaDiv.innerHTML = html;
			document.head.append(...gaDiv.childNodes);
		}
	});

// Service Worker Registration
// ===========================
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("./sw.js")
			.then((registration) => {
				console.log("Service Worker registered successfully:", registration.scope);
				
				// Check for updates
				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing;
					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							// New version available
							console.log('New version available! Refresh to update.');
						}
					});
				});
			})
			.catch((error) => {
				console.log("SW registration failed:", error);
			});
	});
	
	// Listen for service worker messages
	navigator.serviceWorker.addEventListener('message', (event) => {
		if (event.data && event.data.type === 'CACHE_UPDATED') {
			console.log('App updated and ready for offline use!');
		}
	});
}

// PWA Install Functionality
// =========================
let deferredPrompt;
let installButton;

window.addEventListener("beforeinstallprompt", (e) => {
	e.preventDefault();
	deferredPrompt = e;
	showInstallButton();
});

function showInstallButton() {
	installButton = document.createElement("button");
	installButton.textContent = "📱 Install App";
	installButton.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		background: #1976d2;
		color: white;
		border: none;
		padding: 12px 16px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		z-index: 1000;
		box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
		transition: all 0.2s ease;
	`;

	installButton.addEventListener("mouseover", () => {
		installButton.style.transform = "translateY(-1px)";
		installButton.style.boxShadow = "0 6px 16px rgba(25, 118, 210, 0.4)";
	});

	installButton.addEventListener("mouseout", () => {
		installButton.style.transform = "translateY(0)";
		installButton.style.boxShadow = "0 4px 12px rgba(25, 118, 210, 0.3)";
	});

	installButton.addEventListener("click", () => {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			deferredPrompt.userChoice.then((choiceResult) => {
				if (choiceResult.outcome === "accepted") {
					hideInstallButton();
				}
				deferredPrompt = null;
			});
		}
	});

	document.body.appendChild(installButton);
}

function hideInstallButton() {
	if (installButton && installButton.parentNode) {
		installButton.parentNode.removeChild(installButton);
		installButton = null;
	}
}

// Hide button if app is already installed
window.addEventListener("appinstalled", () => {
	hideInstallButton();
});

// File Handling API - Handle files opened with the PWA
// ====================================================
if ("launchQueue" in window) {
	window.launchQueue.setConsumer((launchParams) => {
		if (launchParams.files && launchParams.files.length > 0) {
			// Process the first file
			handleLaunchedFile(launchParams.files[0]);
			// Show a welcome message for file opening
			showWelcomeMessage();
		}
	});
}

// Also check URL parameters on page load (alternative method)
window.addEventListener("load", () => {
	// Check if launched via file association
	if (window.location.search.includes("file") || window.location.hash) {
		showWelcomeMessage();
	}
});

function showWelcomeMessage() {
	const message = document.createElement("div");
	message.textContent = "🎉 Welcome! Your file is being processed...";
	message.style.cssText = `
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: #1976d2;
		color: white;
		padding: 20px 30px;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 500;
		z-index: 1002;
		box-shadow: 0 8px 32px rgba(25, 118, 210, 0.3);
		opacity: 0;
		transition: opacity 0.3s ease;
	`;

	document.body.appendChild(message);

	// Fade in
	setTimeout(() => {
		message.style.opacity = "1";
	}, 100);

	// Remove after 2 seconds
	setTimeout(() => {
		message.style.opacity = "0";
		setTimeout(() => {
			if (message.parentNode) {
				message.parentNode.removeChild(message);
			}
		}, 300);
	}, 2000);
}

async function handleLaunchedFile(fileHandle) {
	try {
		// Get the file from the file handle
		const file = await fileHandle.getFile();

		// Verify it's a JPEG file
		if (
			file.type === "image/jpeg" ||
			file.name.toLowerCase().endsWith(".jpg") ||
			file.name.toLowerCase().endsWith(".jpeg")
		) {
			// Wait for the DOM and main script to be ready
			if (document.readyState === "loading") {
				document.addEventListener("DOMContentLoaded", () => {
					processFileWhenReady(file);
				});
			} else {
				processFileWhenReady(file);
			}

			// Show a notification that the file was opened
			showFileOpenedNotification(file.name);
		} else {
			alert("Please select a JPEG image file.");
		}
	} catch (error) {
		console.error("Error handling launched file:", error);
	}
}

function processFileWhenReady(file) {
	// Wait for the main handleFile function to be available
	const checkForHandleFile = setInterval(() => {
		if (window.handleFile && typeof window.handleFile === "function") {
			clearInterval(checkForHandleFile);
			window.handleFile(file);
		} else if (typeof handleFile === "function") {
			clearInterval(checkForHandleFile);
			handleFile(file);
		}
	}, 100);

	// Fallback timeout after 5 seconds
	setTimeout(() => {
		clearInterval(checkForHandleFile);
	}, 5000);
}

function showFileOpenedNotification(fileName) {
	const notification = document.createElement("div");
	notification.textContent = `📂 Opened: ${fileName}`;
	notification.style.cssText = `
		position: fixed;
		top: 70px;
		right: 20px;
		background: #4caf50;
		color: white;
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 14px;
		z-index: 1001;
		box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
		opacity: 0;
		transition: opacity 0.3s ease;
	`;

	document.body.appendChild(notification);

	// Fade in
	setTimeout(() => {
		notification.style.opacity = "1";
	}, 100);

	// Remove after 3 seconds
	setTimeout(() => {
		notification.style.opacity = "0";
		setTimeout(() => {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		}, 300);
	}, 3000);
}

// Main Application Logic
// ======================

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
	initializeApp();
});

function initializeApp() {
	// Get references to DOM elements
	const dropArea = document.getElementById("drop-area");
	const metadataDiv = document.getElementById("metadata");
	const mapDiv = document.getElementById("map");
	const imagePreviewDiv = document.getElementById("image-preview");
	const filePicker = document.getElementById("file-picker");
	const splitterButtonArea = document.getElementById("splitter-button-area");
	const splitPanoramaBtn = document.getElementById("split-panorama-btn");
	const panoSplitterModal = document.getElementById("pano-splitter-modal");
	const closeModalBtn = document.getElementById("close-modal");
	const splitterContent = document.getElementById("splitter-content");
	const exifOverlayButtonArea = document.getElementById("exif-overlay-button-area");
	const createExifOverlayBtn = document.getElementById("create-exif-overlay-btn");
	const exifOverlayModal = document.getElementById("exif-overlay-modal");
	const closeExifModalBtn = document.getElementById("close-exif-modal");
	const exifOverlayContent = document.getElementById("exif-overlay-content");

	// Make elements globally available
	window.dropArea = dropArea;
	window.metadataDiv = metadataDiv;
	window.mapDiv = mapDiv;
	window.imagePreviewDiv = imagePreviewDiv;
	window.filePicker = filePicker;
	window.splitterButtonArea = splitterButtonArea;
	window.splitPanoramaBtn = splitPanoramaBtn;
	window.panoSplitterModal = panoSplitterModal;
	window.closeModalBtn = closeModalBtn;
	window.splitterContent = splitterContent;
	window.exifOverlayButtonArea = exifOverlayButtonArea;
	window.createExifOverlayBtn = createExifOverlayBtn;
	window.exifOverlayModal = exifOverlayModal;
	window.closeExifModalBtn = closeExifModalBtn;
	window.exifOverlayContent = exifOverlayContent;

	// Initialize global variables
	window.currentMap = null;
	window.currentButtonContainer = null;
	window.currentImageFile = null;
	window.originalImage = null;
	window.slicedImages = [];
	window.fullViewImage = null;
	window.currentExifData = null;
	window.selectedAspectRatio = null;
	window.overlayPreviewCanvas = null;

	// Configuration constants
	window.aspectRatio = 4/5; // Instagram 4:5 aspect ratio
	window.standardWidth = 1080;
	window.standardHeight = Math.round(window.standardWidth / window.aspectRatio); // 1350
	window.minSlices = 2;

	// Set up event listeners
	setupEventListeners();
}

function setupEventListeners() {
	// File picker change event
	filePicker.addEventListener("change", (e) => {
		if (e.target.files.length > 0) {
			handleFile(e.target.files[0]);
		}
	});

	// Drag and drop events for drop area
	dropArea.addEventListener("dragover", (e) => {
		e.preventDefault();
		dropArea.classList.add("dragover");
	});

	dropArea.addEventListener("dragleave", () => {
		dropArea.classList.remove("dragover");
	});

	dropArea.addEventListener("drop", (e) => {
		e.preventDefault();
		dropArea.classList.remove("dragover");
		const files = e.dataTransfer.files;
		if (files.length > 0) {
			handleFile(files[0]);
		}
	});

	// Global drag and drop events for entire page
	document.addEventListener("dragover", (e) => {
		e.preventDefault();
	});

	document.addEventListener("drop", (e) => {
		e.preventDefault();
		const files = e.dataTransfer.files;
		if (files.length > 0) {
			handleFile(files[0]);
		}
	});

	// Modal close events
	closeModalBtn.addEventListener("click", closeSplitterModal);
	closeExifModalBtn.addEventListener("click", closeExifOverlayModal);

	// Button click events
	splitPanoramaBtn.addEventListener("click", openSplitterModal);
	createExifOverlayBtn.addEventListener("click", openExifOverlayModal);

	// Close modals when clicking outside
	panoSplitterModal.addEventListener("click", (e) => {
		if (e.target === panoSplitterModal) {
			closeSplitterModal();
		}
	});

	exifOverlayModal.addEventListener("click", (e) => {
		if (e.target === exifOverlayModal) {
			closeExifOverlayModal();
		}
	});
}

// File Handling Functions
// =======================

function handleFile(file) {
	if (!file.type.startsWith("image/")) {
		alert("Please select an image file.");
		return;
	}

	currentImageFile = file;
	const reader = new FileReader();
	reader.onload = function(e) {
		displayImagePreview(e.target.result);
		EXIF.getData(file, function() {
			const exifData = EXIF.getAllTags(this);
			displayMetadata(exifData, file);
			currentExifData = exifData;
			showButtons(file, exifData);
		});
	};
	reader.readAsDataURL(file);
}

// Make handleFile globally available for PWA file handling
window.handleFile = handleFile;

function displayImagePreview(imageSrc) {
	imagePreviewDiv.innerHTML = `
		<div style="text-align: center; margin-bottom: 20px;">
			<h3 style="margin: 0 0 12px 0; color: #333;">Image Preview</h3>
			<img src="${imageSrc}" alt="Uploaded image" style="max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
		</div>
	`;
}

function displayMetadata(exifData, file) {
	let metadataHTML = `
		<div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 20px;">
			<h2 style="margin: 0 0 20px 0; color: #333; display: flex; align-items: center; gap: 8px;">
				<span style="font-size: 24px;">📋</span>
				File Information
			</h2>
			<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
	`;

	// File info
	metadataHTML += `
		<div style="background: #f8f9fa; padding: 12px; border-radius: 8px;">
			<strong style="color: #1976d2;">File Name:</strong><br>
			<span style="color: #666; word-break: break-all;">${file.name}</span>
		</div>
		<div style="background: #f8f9fa; padding: 12px; border-radius: 8px;">
			<strong style="color: #1976d2;">File Size:</strong><br>
			<span style="color: #666;">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
		</div>
		<div style="background: #f8f9fa; padding: 12px; border-radius: 8px;">
			<strong style="color: #1976d2;">File Type:</strong><br>
			<span style="color: #666;">${file.type}</span>
		</div>
	`;

	metadataHTML += `</div></div>`;

	// EXIF data
	if (Object.keys(exifData).length > 0) {
		metadataHTML += `
			<div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 20px;">
				<h2 style="margin: 0 0 20px 0; color: #333; display: flex; align-items: center; gap: 8px;">
					<span style="font-size: 24px;">📷</span>
					EXIF Data
				</h2>
				<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
		`;

		// Key EXIF fields
		const keyFields = {
			'Make': 'Camera Make',
			'Model': 'Camera Model',
			'LensModel': 'Lens Model',
			'DateTime': 'Date Taken',
			'FNumber': 'Aperture',
			'ExposureTime': 'Shutter Speed',
			'ISO': 'ISO Speed',
			'FocalLength': 'Focal Length',
			'FocalLengthIn35mmFilm': 'Focal Length (35mm equiv.)',
			'Flash': 'Flash',
			'WhiteBalance': 'White Balance',
			'ExposureMode': 'Exposure Mode',
			'MeteringMode': 'Metering Mode',
			'ColorSpace': 'Color Space',
			'PixelXDimension': 'Image Width',
			'PixelYDimension': 'Image Height'
		};

		Object.entries(keyFields).forEach(([key, label]) => {
			if (exifData[key] !== undefined && exifData[key] !== null) {
				let value = exifData[key];
				
				// Format specific values
				if (key === 'FNumber') {
					value = `f/${value}`;
				} else if (key === 'ExposureTime') {
					if (value < 1) {
						value = `1/${Math.round(1/value)}s`;
					} else {
						value = `${value}s`;
					}
				} else if (key === 'FocalLength' || key === 'FocalLengthIn35mmFilm') {
					value = `${value}mm`;
				} else if (key === 'PixelXDimension' || key === 'PixelYDimension') {
					value = `${value}px`;
				}

				metadataHTML += `
					<div style="background: #f8f9fa; padding: 12px; border-radius: 8px;">
						<strong style="color: #1976d2;">${label}:</strong><br>
						<span style="color: #666;">${value}</span>
					</div>
				`;
			}
		});

		metadataHTML += `</div></div>`;
	} else {
		metadataHTML += `
			<div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 16px; text-align: center;">
				<p style="margin: 0; color: #856404;">⚠️ No EXIF data found in this image.</p>
			</div>
		`;
	}

	metadataDiv.innerHTML = metadataHTML;

	// Check for GPS data and show map
	if (exifData.GPSLatitude && exifData.GPSLongitude) {
		showMap(exifData);
	} else {
		hideMap();
	}
}

// Map Functions
// =============

function showMap(exifData) {
	const lat = convertDMSToDD(exifData.GPSLatitude, exifData.GPSLatitudeRef);
	const lng = convertDMSToDD(exifData.GPSLongitude, exifData.GPSLongitudeRef);

	mapDiv.style.display = 'block';
	mapDiv.style.position = 'relative';
	mapDiv.style.zIndex = '1';
	mapDiv.innerHTML = `
		<div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
			<h2 style="margin: 0 0 20px 0; color: #333; display: flex; align-items: center; gap: 8px;">
				<span style="font-size: 24px;">📍</span>
				Photo Location
			</h2>
			<div id="leaflet-map" style="height: 500px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"></div>
			<div id="map-buttons" style="margin-top: 16px; display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;"></div>
		</div>
		<div style="height: 60px; clear: both;"></div>
	`;

	// Clear existing map
	if (currentMap) {
		currentMap.remove();
	}

	// Create new map
	setTimeout(() => {
		currentMap = L.map('leaflet-map').setView([lat, lng], 15);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors'
		}).addTo(currentMap);

		L.marker([lat, lng])
			.addTo(currentMap)
			.bindPopup(`📷 Photo taken here<br>Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
			.openPopup();

		// Add map control buttons
		addMapButtons(lat, lng);
	}, 100);
}

function hideMap() {
	mapDiv.style.display = 'none';
	if (currentMap) {
		currentMap.remove();
		currentMap = null;
	}
	// Map buttons are cleared when mapDiv.innerHTML is reset, so no need for manual cleanup
}

function convertDMSToDD(dms, ref) {
	let dd = dms[0] + dms[1]/60 + dms[2]/3600;
	if (ref === "S" || ref === "W") {
		dd = dd * -1;
	}
	return dd;
}

function addMapButtons(lat, lng) {
	// Find the map-buttons container that was created dynamically inside the map
	const buttonContainer = document.getElementById('map-buttons');
	currentButtonContainer = buttonContainer;
	
	// Clear any existing buttons (container should already be visible)
	if (buttonContainer) {
		buttonContainer.innerHTML = '';
	}

	const buttons = [
		{
			text: '🗺️ Google Maps',
			action: () => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
		},
		{
			text: '🍎 Apple Maps', 
			action: () => window.open(`https://maps.apple.com/?q=${lat},${lng}`, '_blank')
		},
		{
			text: '📱 What3Words',
			action: () => window.open(`https://what3words.com/${lat},${lng}`, '_blank')
		},
		{
			text: '📋 Copy Coordinates',
			action: () => {
				navigator.clipboard.writeText(`${lat}, ${lng}`).then(() => {
					showTemporaryMessage('Coordinates copied to clipboard!');
				});
			}
		}
	];

	buttons.forEach(button => {
		const btn = document.createElement('button');
		btn.textContent = button.text;
		btn.style.cssText = `
			background: #1976d2;
			color: white;
			border: none;
			padding: 10px 16px;
			border-radius: 6px;
			cursor: pointer;
			font-size: 14px;
			font-weight: 500;
			transition: all 0.2s ease;
		`;

		btn.addEventListener('mouseover', () => {
			btn.style.background = '#1565c0';
			btn.style.transform = 'translateY(-1px)';
		});

		btn.addEventListener('mouseout', () => {
			btn.style.background = '#1976d2';
			btn.style.transform = 'translateY(0)';
		});

		btn.addEventListener('click', button.action);
		if (buttonContainer) {
			buttonContainer.appendChild(btn);
		}
	});
}

function showTemporaryMessage(message) {
	const messageDiv = document.createElement('div');
	messageDiv.textContent = message;
	messageDiv.style.cssText = `
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: #4caf50;
		color: white;
		padding: 16px 24px;
		border-radius: 8px;
		font-weight: 500;
		z-index: 1000;
		box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
		opacity: 0;
		transition: opacity 0.3s ease;
	`;

	document.body.appendChild(messageDiv);

	setTimeout(() => {
		messageDiv.style.opacity = '1';
	}, 100);

	setTimeout(() => {
		messageDiv.style.opacity = '0';
		setTimeout(() => {
			if (messageDiv.parentNode) {
				messageDiv.parentNode.removeChild(messageDiv);
			}
		}, 300);
	}, 2000);
}

// Feature Button Functions
// ========================

function showButtons(file, exifData) {
	// Show Instagram splitter button for all images (not just panoramic)
	// This tool can optimize any image for Instagram with different aspect ratios
	showSplitterButton();

	// Always show EXIF overlay button if we have EXIF data
	if (Object.keys(exifData).length > 0) {
		showExifOverlayButton();
	} else {
		hideExifOverlayButton();
	}
}

// Panorama Splitter Functions
// ===========================

function showSplitterButton() {
	splitterButtonArea.style.display = 'block';
}

function hideSplitterButton() {
	splitterButtonArea.style.display = 'none';
}

function openSplitterModal() {
	if (!currentImageFile) return;
	
	panoSplitterModal.style.display = 'block';
	document.body.style.overflow = 'hidden';
	
	// Initialize the splitter interface
	initializeSplitterInterface();
}

function closeSplitterModal() {
	panoSplitterModal.style.display = 'none';
	document.body.style.overflow = 'auto';
	
	// Reset splitter state
	originalImage = null;
	slicedImages = [];
	fullViewImage = null;
}

function initializeSplitterInterface() {
	splitterContent.innerHTML = `
		<div style="display: flex; gap: 24px; flex-wrap: wrap;">
			<div style="flex: 1; min-width: 300px;">
				<h3 style="margin: 0 0 12px 0; color: #333;">Preview</h3>
				<div style="border: 2px dashed #ddd; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 16px;">
					<img id="splitter-preview" src="" alt="Image preview" style="max-width: 100%; max-height: 300px; border-radius: 4px;">
				</div>
				<div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
					<h4 style="margin: 0 0 8px 0; color: #333;">Image Details</h4>
					<p style="margin: 4px 0; color: #666;">Original Size: <span id="original-size">-</span></p>
					<p style="margin: 4px 0; color: #666;">Scaled Size: <span id="scaled-size">-</span></p>
					<p style="margin: 4px 0; color: #666;">Number of Slices: <span id="slice-count">-</span></p>
					<p style="margin: 4px 0; color: #666;">Slice Resolution: <span id="slice-resolution">-</span></p>
				</div>
				<div style="margin-bottom: 16px;">
					<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
						<input type="checkbox" id="high-res-toggle" checked style="width: 16px; height: 16px;">
						<span style="color: #333; font-weight: 500;">High Resolution Mode</span>
					</label>
					<p style="margin: 4px 0 0 24px; color: #666; font-size: 14px;">Uses maximum possible resolution from your image</p>
				</div>
				<div style="display: flex; gap: 12px;">
					<button id="process-btn" style="
						flex: 1;
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: white;
						border: none;
						padding: 12px 16px;
						border-radius: 6px;
						font-weight: 600;
						cursor: pointer;
						transition: all 0.2s;
					">Generate Slices</button>
					<button id="reset-splitter-btn" style="
						background: #f8f9fa;
						color: #666;
						border: 1px solid #ddd;
						padding: 12px 16px;
						border-radius: 6px;
						cursor: pointer;
						transition: all 0.2s;
					">Reset</button>
				</div>
			</div>
			<div style="flex: 1; min-width: 300px;">
				<h3 style="margin: 0 0 12px 0; color: #333;">Output</h3>
				<div id="output-area" style="min-height: 200px; border: 2px dashed #ddd; border-radius: 8px; padding: 16px; text-align: center; color: #666;">
					Click "Generate Slices" to create Instagram-ready image slices
				</div>
			</div>
		</div>
	`;

	// Set up the preview
	const preview = document.getElementById('splitter-preview');
	preview.src = URL.createObjectURL(currentImageFile);

	// Set up event listeners
	setupSplitterEventListeners();

	// Update image details
	updateImageDetails();
}

function setupSplitterEventListeners() {
	const processBtn = document.getElementById('process-btn');
	const resetBtn = document.getElementById('reset-splitter-btn');
	const highResToggle = document.getElementById('high-res-toggle');

	processBtn.addEventListener('click', processImage);
	resetBtn.addEventListener('click', resetSplitter);
	highResToggle.addEventListener('change', updateImageDetails);
}

function updateImageDetails() {
	const img = new Image();
	img.onload = function() {
		const isHighRes = document.getElementById('high-res-toggle').checked;
		const originalWidth = this.naturalWidth;
		const originalHeight = this.naturalHeight;
		
		let targetWidth, targetHeight;
		if (isHighRes) {
			// Use the maximum possible width while maintaining Instagram aspect ratio
			targetHeight = Math.min(originalHeight, 1350); // Instagram max height
			targetWidth = Math.round(targetHeight * aspectRatio);
			
			// If the calculated width exceeds original width, scale down
			if (targetWidth > originalWidth) {
				targetWidth = originalWidth;
				targetHeight = Math.round(targetWidth / aspectRatio);
			}
		} else {
			targetWidth = standardWidth;
			targetHeight = standardHeight;
		}

		const numSlices = Math.max(minSlices, Math.ceil(originalWidth / targetWidth));
		
		document.getElementById('original-size').textContent = `${originalWidth} × ${originalHeight}`;
		document.getElementById('scaled-size').textContent = `${targetWidth} × ${targetHeight}`;
		document.getElementById('slice-count').textContent = numSlices;
		document.getElementById('slice-resolution').textContent = `${targetWidth} × ${targetHeight}`;
	};
	img.src = URL.createObjectURL(currentImageFile);
}

function processImage() {
	const processBtn = document.getElementById('process-btn');
	const outputArea = document.getElementById('output-area');
	
	processBtn.disabled = true;
	processBtn.textContent = 'Processing...';
	
	outputArea.innerHTML = '<div style="padding: 20px;">🔄 Processing image...</div>';

	setTimeout(() => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		
		const img = new Image();
		img.onload = function() {
			const isHighRes = document.getElementById('high-res-toggle').checked;
			
			let targetWidth, targetHeight;
			if (isHighRes) {
				targetHeight = Math.min(this.naturalHeight, 1350);
				targetWidth = Math.round(targetHeight * aspectRatio);
				
				if (targetWidth > this.naturalWidth) {
					targetWidth = this.naturalWidth;
					targetHeight = Math.round(targetWidth / aspectRatio);
				}
			} else {
				targetWidth = standardWidth;
				targetHeight = standardHeight;
			}

			const numSlices = Math.max(minSlices, Math.ceil(this.naturalWidth / targetWidth));
			const sliceWidth = this.naturalWidth / numSlices;
			
			slicedImages = [];
			
			// Create slices
			for (let i = 0; i < numSlices; i++) {
				canvas.width = targetWidth;
				canvas.height = targetHeight;
				
				const sourceX = i * sliceWidth;
				const sourceWidth = sliceWidth;
				
				// Draw the slice
				ctx.drawImage(
					this,
					sourceX, 0, sourceWidth, this.naturalHeight,
					0, 0, targetWidth, targetHeight
				);
				
				// Convert to blob and store
				const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
				slicedImages.push({
					dataUrl,
					filename: `slice_${i + 1}_of_${numSlices}.jpg`
				});
			}
			
			// Create the full view image
			createFullViewImageForPreview().then(fullViewData => {
				if (fullViewData) {
					// Store the full view image data
					window.fullViewImage = fullViewData;
				}
				displaySlices();
				processBtn.disabled = false;
				processBtn.textContent = 'Generate Slices';
			});
		};
		
		img.src = URL.createObjectURL(currentImageFile);
	}, 100);
}

function createFullViewImageForPreview() {
	return new Promise((resolve) => {
		if (!currentImageFile) {
			resolve(null);
			return;
		}
		
		const img = new Image();
		img.onload = function() {
			// Use the same dimensions as the slices for consistency
			const sliceWidth = 1080;
			const sliceHeight = 1350; // 4:5 aspect ratio
			
			// Create a canvas with the same aspect ratio as the slices
			const fullCanvas = document.createElement('canvas');
			const fullCtx = fullCanvas.getContext('2d');
			
			fullCanvas.width = sliceWidth;
			fullCanvas.height = sliceHeight;
			
			// Fill with white background
			fullCtx.fillStyle = '#FFFFFF';
			fullCtx.fillRect(0, 0, sliceWidth, sliceHeight);
			
			// Calculate the scale for the panorama to fit within the frame with margins
			const margin = Math.round(sliceWidth * 0.08); // 8% margin
			const availableWidth = sliceWidth - (margin * 2);
			const availableHeight = sliceHeight - (margin * 2);
			
			// Determine which dimension constrains the scaling
			const originalAspectRatio = this.naturalWidth / this.naturalHeight;
			let scaledPanoWidth, scaledPanoHeight;
			
			if (originalAspectRatio > availableWidth / availableHeight) {
				// Width is the constraining factor
				scaledPanoWidth = availableWidth;
				scaledPanoHeight = scaledPanoWidth / originalAspectRatio;
			} else {
				// Height is the constraining factor
				scaledPanoHeight = availableHeight;
				scaledPanoWidth = scaledPanoHeight * originalAspectRatio;
			}
			
			// Calculate position to center the image
			const x = Math.round((sliceWidth - scaledPanoWidth) / 2);
			const y = Math.round((sliceHeight - scaledPanoHeight) / 2);
			
			// Draw the scaled panorama centered on the white canvas
			fullCtx.drawImage(
				this,
				0, 0, this.naturalWidth, this.naturalHeight,
				x, y, scaledPanoWidth, scaledPanoHeight
			);
			
			// Add a subtle border
			fullCtx.strokeStyle = '#EEEEEE';
			fullCtx.lineWidth = 1;
			fullCtx.strokeRect(x - 1, y - 1, scaledPanoWidth + 2, scaledPanoHeight + 2);
			
			resolve({
				dataUrl: fullCanvas.toDataURL('image/jpeg', 0.95),
				width: sliceWidth,
				height: sliceHeight
			});
		};
		
		img.src = URL.createObjectURL(currentImageFile);
	});
}

function displaySlices() {
	const outputArea = document.getElementById('output-area');
	
	let html = `
		<div style="margin-bottom: 16px;">
			<h4 style="margin: 0 0 8px 0; color: #333;">✅ Generated ${slicedImages.length} slices</h4>
			<div style="display: flex; gap: 8px; margin-bottom: 16px; justify-content: center;">
				<button id="download-all-btn" style="
					background: #4caf50;
					color: white;
					border: none;
					padding: 8px 16px;
					border-radius: 4px;
					cursor: pointer;
					font-size: 14px;
					font-weight: 500;
				">📥 Download All</button>
			</div>
		</div>
		<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">
	`;
	
	// Add the full view as the first item if available
	if (window.fullViewImage) {
		html += `
			<div style="text-align: center; position: relative;">
				<img src="${window.fullViewImage.dataUrl}" alt="Full View" style="width: 100%; border-radius: 4px; border: 2px solid #4caf50;">
				<div style="
					position: absolute;
					top: 4px;
					left: 4px;
					background: #4caf50;
					color: white;
					padding: 2px 6px;
					border-radius: 3px;
					font-size: 10px;
					font-weight: bold;
				">FULL VIEW</div>
				<div style="
					margin-top: 4px;
					font-size: 10px;
					color: #666;
				">${window.fullViewImage.width}×${window.fullViewImage.height}</div>
			</div>
		`;
	}
	
	slicedImages.forEach((slice, index) => {
		html += `
			<div style="text-align: center;">
				<img src="${slice.dataUrl}" alt="Slice ${index + 1}" style="width: 100%; border-radius: 4px; border: 1px solid #ddd;">
				<button onclick="downloadSlice(${index})" style="
					margin-top: 4px;
					padding: 4px 8px;
					background: #666;
					color: white;
					border: none;
					border-radius: 3px;
					cursor: pointer;
					font-size: 12px;
				">Download</button>
			</div>
		`;
	});
	
	html += '</div>';
	outputArea.innerHTML = html;
	
	// Set up download buttons
	document.getElementById('download-all-btn').addEventListener('click', downloadAllSlices);
}

function downloadSlice(index) {
	const slice = slicedImages[index];
	const link = document.createElement('a');
	link.href = slice.dataUrl;
	link.download = slice.filename;
	link.click();
}

window.downloadSlice = downloadSlice;

function downloadAllSlices() {
	const zip = new JSZip();
	
	// Add individual slices
	slicedImages.forEach((slice, index) => {
		// Convert data URL to blob
		const base64Data = slice.dataUrl.split(',')[1];
		zip.file(slice.filename, base64Data, { base64: true });
	});
	
	// Create and add the full view image (properly bordered like original panosplitter)
	createFullViewImage().then(fullViewData => {
		if (fullViewData) {
			const base64Data = fullViewData.split(',')[1];
			zip.file('slice_00_full_view.jpg', base64Data, { base64: true });
		}
		
		zip.generateAsync({ type: 'blob' }).then(function(content) {
			saveAs(content, 'instagram_slices.zip');
		});
	});
}

function createFullViewImage() {
	return new Promise((resolve) => {
		if (!currentImageFile) {
			resolve(null);
			return;
		}
		
		const img = new Image();
		img.onload = function() {
			// Use the same dimensions as the slices for consistency
			const sliceWidth = 1080;
			const sliceHeight = 1350; // 4:5 aspect ratio
			
			// Create a canvas with the same aspect ratio as the slices
			const fullCanvas = document.createElement('canvas');
			const fullCtx = fullCanvas.getContext('2d');
			
			fullCanvas.width = sliceWidth;
			fullCanvas.height = sliceHeight;
			
			// Fill with white background
			fullCtx.fillStyle = '#FFFFFF';
			fullCtx.fillRect(0, 0, sliceWidth, sliceHeight);
			
			// Calculate the scale for the panorama to fit within the frame with margins
			const margin = Math.round(sliceWidth * 0.08); // 8% margin
			const availableWidth = sliceWidth - (margin * 2);
			const availableHeight = sliceHeight - (margin * 2);
			
			// Determine which dimension constrains the scaling
			const originalAspectRatio = this.naturalWidth / this.naturalHeight;
			let scaledPanoWidth, scaledPanoHeight;
			
			if (originalAspectRatio > availableWidth / availableHeight) {
				// Width is the constraining factor
				scaledPanoWidth = availableWidth;
				scaledPanoHeight = scaledPanoWidth / originalAspectRatio;
			} else {
				// Height is the constraining factor
				scaledPanoHeight = availableHeight;
				scaledPanoWidth = scaledPanoHeight * originalAspectRatio;
			}
			
			// Calculate position to center the image
			const x = Math.round((sliceWidth - scaledPanoWidth) / 2);
			const y = Math.round((sliceHeight - scaledPanoHeight) / 2);
			
			// Draw the scaled panorama centered on the white canvas
			fullCtx.drawImage(
				this,
				0, 0, this.naturalWidth, this.naturalHeight,
				x, y, scaledPanoWidth, scaledPanoHeight
			);
			
			// Add a subtle border
			fullCtx.strokeStyle = '#EEEEEE';
			fullCtx.lineWidth = 1;
			fullCtx.strokeRect(x - 1, y - 1, scaledPanoWidth + 2, scaledPanoHeight + 2);
			
			resolve(fullCanvas.toDataURL('image/jpeg', 0.95));
		};
		
		img.src = URL.createObjectURL(currentImageFile);
	});
}

function resetSplitter() {
	originalImage = null;
	slicedImages = [];
	fullViewImage = null;
	
	const outputArea = document.getElementById('output-area');
	outputArea.innerHTML = 'Click "Generate Slices" to create Instagram-ready image slices';
	
	// Reset high-res toggle
	document.getElementById('high-res-toggle').checked = true;
	updateImageDetails();
}

// EXIF Overlay Functions
// =====================

function showExifOverlayButton() {
	exifOverlayButtonArea.style.display = 'block';
}

function hideExifOverlayButton() {
	exifOverlayButtonArea.style.display = 'none';
}

function openExifOverlayModal() {
	exifOverlayModal.style.display = 'block';
	document.body.style.overflow = 'hidden';
	
	// Initialize the EXIF overlay interface
	initializeExifOverlayInterface();
}

function closeExifOverlayModal() {
	exifOverlayModal.style.display = 'none';
	document.body.style.overflow = 'auto';
}

// Since this function is quite large, I'll continue with the rest in the next part...

function initializeExifOverlayInterface() {
	exifOverlayContent.innerHTML = `
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; height: 80vh;">
			<!-- Left Panel - Controls -->
			<div style="overflow-y: auto; padding-right: 12px;">
				<h3 style="margin: 0 0 16px 0; color: #333;">Styling Options</h3>
				
				<!-- Font Selection -->
				<div style="margin-bottom: 20px;">
					<label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Font Family</label>
					<select id="font-family" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
						<option value="Roboto, sans-serif" selected>Roboto (Clean Sans)</option>
						<option value="Inter, sans-serif">Inter (Modern Sans)</option>
						<option value="'Open Sans', sans-serif">Open Sans (Friendly Sans)</option>
						<option value="Lato, sans-serif">Lato (Humanist Sans)</option>
						<option value="Montserrat, sans-serif">Montserrat (Geometric Sans)</option>
						<option value="Nunito, sans-serif">Nunito (Rounded Sans)</option>
						<option value="Poppins, sans-serif">Poppins (Stylish Sans)</option>
						<option value="'Playfair Display', serif">'Playfair Display' (Elegant Serif)</option>
						<option value="Arial, sans-serif">Arial (System Default)</option>
					</select>
				</div>
				
				<!-- Border Settings -->
				<div style="margin-bottom: 20px;">
					<label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Border Width</label>
					<input type="range" id="border-width" min="20" max="120" value="40" style="width: 100%; margin-bottom: 8px;">
					<span id="border-width-value" style="font-size: 14px; color: #666;">40px</span>
					
					<!-- Instagram Border Presets -->
					<div style="margin-top: 12px;">
						<label style="display: block; margin-bottom: 6px; font-size: 14px; color: #666;">Instagram Presets</label>
						<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
							<button id="preset-thin" style="padding: 6px 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; font-size: 11px; text-align: center;">Thin<br><span style="font-size: 10px; color: #666;">25px</span></button>
							<button id="preset-medium" style="padding: 6px 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; font-size: 11px; text-align: center;">Medium<br><span style="font-size: 10px; color: #666;">50px</span></button>
							<button id="preset-thick" style="padding: 6px 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; font-size: 11px; text-align: center;">Thick<br><span style="font-size: 10px; color: #666;">80px</span></button>
							<button id="preset-polaroid" style="padding: 6px 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; font-size: 11px; text-align: center;">Polaroid<br><span style="font-size: 10px; color: #666;">100px</span></button>
						</div>
					</div>
				</div>
				
				<div style="margin-bottom: 20px;">
					<label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Border Color</label>
					<div style="display: grid; grid-template-columns: 1fr repeat(3, auto); gap: 8px; align-items: center;">
						<input type="color" id="border-color" value="#ffffff" style="width: 100%; height: 40px; border: 1px solid #ddd; border-radius: 4px;">
						<button id="preset-white" style="padding: 8px 12px; background: #fff; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px;">White</button>
						<button id="preset-black" style="padding: 8px 12px; background: #000; color: #fff; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px;">Black</button>
						<button id="preset-cream" style="padding: 8px 12px; background: #f5f5dc; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px;">Cream</button>
					</div>
				</div>
				
				<!-- Instagram Aspect Ratio Presets -->
				<div style="margin-bottom: 20px;">
					<label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Instagram Aspect Ratios</label>
					<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
						<button id="aspect-square" style="padding: 10px 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px; text-align: center;">
							<div style="font-weight: 600;">Square</div>
							<div style="font-size: 10px; color: #666;">1:1 • Feed Posts</div>
						</button>
						<button id="aspect-portrait" style="padding: 10px 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px; text-align: center;">
							<div style="font-weight: 600;">Portrait</div>
							<div style="font-size: 10px; color: #666;">4:5 • Feed Posts</div>
						</button>
					</div>
					<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
						<button id="aspect-story" style="padding: 10px 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px; text-align: center;">
							<div style="font-weight: 600;">Story</div>
							<div style="font-size: 10px; color: #666;">9:16 • Stories</div>
						</button>
						<button id="aspect-landscape" style="padding: 10px 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px; text-align: center;">
							<div style="font-weight: 600;">Landscape</div>
							<div style="font-size: 10px; color: #666;">16:9 • Reels</div>
						</button>
					</div>
					<div style="font-size: 11px; color: #666; margin-top: 8px; font-style: italic;">
						Aspect ratio will be applied when you upload an image
					</div>
				</div>
				
				<!-- Text Settings -->
				<div style="margin-bottom: 20px;">
					<label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Font Size</label>
					<input type="range" id="font-size" min="10" max="28" value="16" style="width: 100%; margin-bottom: 8px;">
					<span id="font-size-value" style="font-size: 14px; color: #666;">16px</span>
				</div>
				
				<div style="margin-bottom: 20px;">
					<label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Text Color</label>
					<div style="display: grid; grid-template-columns: 1fr repeat(3, auto); gap: 8px; align-items: center;">
						<input type="color" id="text-color" value="#000000" style="width: 100%; height: 40px; border: 1px solid #ddd; border-radius: 4px;">
						<button id="text-black" style="padding: 8px 12px; background: #000; color: #fff; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px;">Black</button>
						<button id="text-white" style="padding: 8px 12px; background: #fff; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px;">White</button>
						<button id="text-gray" style="padding: 8px 12px; background: #666; color: #fff; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px;">Gray</button>
					</div>
				</div>
				
				<!-- Separator Character -->
				<div style="margin-bottom: 20px;">
					<label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Separator</label>
					<select id="separator-char" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
						<option value=" • ">Bullet (•)</option>
						<option value=" | ">Pipe (|)</option>
						<option value=" / ">Forward Slash (/)</option>
						<option value=" — ">Em Dash (—)</option>
						<option value=" · ">Middle Dot (·)</option>
						<option value="   ">Spaces Only</option>
					</select>
				</div>
				
				<!-- EXIF Data Selection -->
				<div style="margin-bottom: 20px;">
					<label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Camera Data to Display</label>
					<div id="exif-checkboxes" style="border: 1px solid #ddd; border-radius: 4px; padding: 12px; background: #f9f9f9;">
						<!-- Essential photography fields only -->
					</div>
				</div>
				
				<!-- Action Buttons -->
				<div style="display: flex; gap: 12px; margin-top: 20px;">
					<button id="reset-exif-overlay" style="
						flex: 1;
						background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
						color: white;
						border: none;
						padding: 12px 16px;
						border-radius: 6px;
						font-weight: 600;
						cursor: pointer;
						transition: all 0.2s;
					">Reset All</button>
					<button id="preview-exif-overlay" style="
						flex: 1;
						background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
						color: white;
						border: none;
						padding: 12px 16px;
						border-radius: 6px;
						font-weight: 600;
						cursor: pointer;
						transition: all 0.2s;
					">Refresh Preview</button>
					<button id="download-exif-overlay" style="
						flex: 1;
						background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
						color: white;
						border: none;
						padding: 12px 16px;
						border-radius: 6px;
						font-weight: 600;
						cursor: pointer;
						transition: all 0.2s;
					">Download Image</button>
				</div>
			</div>
			
			<!-- Right Panel - Preview -->
			<div style="display: flex; flex-direction: column;">
				<h3 style="margin: 0 0 16px 0; color: #333;">Preview</h3>
				<div style="flex: 1; border: 2px dashed #ddd; border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: center; background: #f9f9f9;">
					<div id="preview-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #666;">
						<canvas id="exif-preview-canvas" style="max-width: 100%; max-height: 100%; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: none;"></canvas>
						<div id="no-image-message" style="font-size: 16px; line-height: 1.5;">
							<div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">📷</div>
							<div style="margin-bottom: 8px; font-weight: 600;">No Image Selected</div>
							<div style="font-size: 14px; opacity: 0.7; margin-bottom: 12px;">Upload an image in the Metadata Viewer tab first</div>
							<div style="font-size: 12px; opacity: 0.5;">Then click "Refresh Preview" to update this view</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
	
	// Setup event listeners for the EXIF overlay interface
	setupExifOverlayEventListeners();
	
	// Populate EXIF checkboxes
	populateEssentialExifCheckboxes();
	
	// Set initial font family value and trigger update
	const fontFamilySelect = document.getElementById('font-family');
	fontFamilySelect.value = 'Roboto, sans-serif';
	
	// Wait for fonts to load before initial preview
	if (document.fonts && document.fonts.ready) {
		document.fonts.ready.then(() => {
			setTimeout(() => {
				updateExifOverlayPreview();
			}, 100);
		});
	} else {
		// Fallback for browsers without Font Loading API
		setTimeout(() => {
			updateExifOverlayPreview();
		}, 500); // Longer delay to allow fonts to load
	}
}

let exifEventListenersSetup = false;

function setupExifOverlayEventListeners() {
	// Prevent duplicate event listener setup
	if (exifEventListenersSetup) return;
	exifEventListenersSetup = true;
	
	// Range inputs with live value display
	const borderWidth = document.getElementById('border-width');
	const borderWidthValue = document.getElementById('border-width-value');
	const fontSize = document.getElementById('font-size');
	const fontSizeValue = document.getElementById('font-size-value');
	
	borderWidth.addEventListener('input', () => {
		borderWidthValue.textContent = borderWidth.value + 'px';
		updateExifOverlayPreview();
	});
	
	fontSize.addEventListener('input', () => {
		fontSizeValue.textContent = fontSize.value + 'px';
		updateExifOverlayPreview();
	});
	
	// Color and selection inputs
	['border-color', 'text-color', 'separator-char'].forEach(id => {
		document.getElementById(id).addEventListener('change', updateExifOverlayPreview);
	});
	
	// Font family needs special handling for immediate updates
	const fontFamilySelect = document.getElementById('font-family');
	fontFamilySelect.addEventListener('change', () => {
		updateExifOverlayPreview();
	});
	fontFamilySelect.addEventListener('input', () => {
		updateExifOverlayPreview();
	});
	
	// Color preset buttons
	document.getElementById('preset-white').addEventListener('click', () => {
		document.getElementById('border-color').value = '#ffffff';
		updateExifOverlayPreview();
	});
	
	document.getElementById('preset-black').addEventListener('click', () => {
		document.getElementById('border-color').value = '#000000';
		updateExifOverlayPreview();
	});
	
	document.getElementById('preset-cream').addEventListener('click', () => {
		document.getElementById('border-color').value = '#f5f5dc';
		updateExifOverlayPreview();
	});
	
	// Border size preset buttons
	document.getElementById('preset-thin').addEventListener('click', () => {
		const borderWidth = document.getElementById('border-width');
		const borderWidthValue = document.getElementById('border-width-value');
		borderWidth.value = '25';
		borderWidthValue.textContent = '25px';
		updateExifOverlayPreview();
	});
	
	document.getElementById('preset-medium').addEventListener('click', () => {
		const borderWidth = document.getElementById('border-width');
		const borderWidthValue = document.getElementById('border-width-value');
		borderWidth.value = '50';
		borderWidthValue.textContent = '50px';
		updateExifOverlayPreview();
	});
	
	document.getElementById('preset-thick').addEventListener('click', () => {
		const borderWidth = document.getElementById('border-width');
		const borderWidthValue = document.getElementById('border-width-value');
		borderWidth.value = '80';
		borderWidthValue.textContent = '80px';
		updateExifOverlayPreview();
	});
	
	document.getElementById('preset-polaroid').addEventListener('click', () => {
		const borderWidth = document.getElementById('border-width');
		const borderWidthValue = document.getElementById('border-width-value');
		borderWidth.value = '100';
		borderWidthValue.textContent = '100px';
		updateExifOverlayPreview();
	});
	
	// Aspect ratio preset buttons
	document.getElementById('aspect-square').addEventListener('click', () => {
		selectedAspectRatio = 1; // 1:1
		updateAspectRatioButtons('aspect-square');
		updateExifOverlayPreview();
	});
	
	document.getElementById('aspect-portrait').addEventListener('click', () => {
		selectedAspectRatio = 4/5; // 4:5
		updateAspectRatioButtons('aspect-portrait');
		updateExifOverlayPreview();
	});
	
	document.getElementById('aspect-story').addEventListener('click', () => {
		selectedAspectRatio = 9/16; // 9:16
		updateAspectRatioButtons('aspect-story');
		updateExifOverlayPreview();
	});
	
	document.getElementById('aspect-landscape').addEventListener('click', () => {
		selectedAspectRatio = 16/9; // 16:9
		updateAspectRatioButtons('aspect-landscape');
		updateExifOverlayPreview();
	});
	
	document.getElementById('text-black').addEventListener('click', () => {
		document.getElementById('text-color').value = '#000000';
		updateExifOverlayPreview();
	});
	
	document.getElementById('text-white').addEventListener('click', () => {
		document.getElementById('text-color').value = '#ffffff';
		updateExifOverlayPreview();
	});
	
	document.getElementById('text-gray').addEventListener('click', () => {
		document.getElementById('text-color').value = '#666666';
		updateExifOverlayPreview();
	});
	
	// Action buttons
	document.getElementById('reset-exif-overlay').addEventListener('click', resetExifOverlaySettings);
	document.getElementById('preview-exif-overlay').addEventListener('click', updateExifOverlayPreview);
	document.getElementById('download-exif-overlay').addEventListener('click', downloadExifOverlay);
}

function resetExifOverlaySettings() {
	// Reset the event listener flag so we can re-setup if needed
	exifEventListenersSetup = false;
	
	// Reset border settings
	document.getElementById('border-width').value = '40';
	document.getElementById('border-width-value').textContent = '40px';
	document.getElementById('border-color').value = '#ffffff';
	
	// Reset text settings
	const fontSizeSlider = document.getElementById('font-size');
	const fontSizeValue = document.getElementById('font-size-value');
	
	fontSizeSlider.value = '16';
	fontSizeValue.textContent = '16px';
	
	document.getElementById('text-color').value = '#000000';
	document.getElementById('font-family').value = 'Roboto, sans-serif';
	
	// Reset separator
	document.getElementById('separator-char').value = ' • ';
	
	// Reset aspect ratio
	selectedAspectRatio = null;
	updateAspectRatioButtons(null);
	
	// Reset checkboxes manually without recreating them
	const cameraFields = ['Make', 'Model', 'LensModel'];
	const allFields = ['FNumber', 'ExposureTime', 'ISOSpeedRatings', 'FocalLength', 'Make', 'Model', 'LensModel'];
	
	allFields.forEach(field => {
		const checkbox = document.getElementById(`exif-${field}`);
		if (checkbox) {
			// Check photography data by default, uncheck camera/gear data
			checkbox.checked = !cameraFields.includes(field);
		}
	});
	
	// Trigger input event manually to ensure slider works
	fontSizeSlider.dispatchEvent(new Event('input'));
	
	// Re-setup event listeners after reset
	setupExifOverlayEventListeners();
	
	// Update preview after a small delay
	setTimeout(() => {
		updateExifOverlayPreview();
	}, 50);
}

function updateAspectRatioButtons(activeId) {
	// Reset all buttons
	['aspect-square', 'aspect-portrait', 'aspect-story', 'aspect-landscape'].forEach(id => {
		const button = document.getElementById(id);
		if (button) {
			button.style.background = '#f8f9fa';
			button.style.borderColor = '#ddd';
		}
	});
	
	// Highlight active button if specified
	if (activeId) {
		const activeButton = document.getElementById(activeId);
		if (activeButton) {
			activeButton.style.background = '#e3f2fd';
			activeButton.style.borderColor = '#2196f3';
		}
	}
}

function populateEssentialExifCheckboxes() {
	const container = document.getElementById('exif-checkboxes');
	if (!container) return;
	
	// Essential photography data fields only
	const essentialFields = [
		{ key: 'FNumber', label: 'Aperture (f/)', displayLabel: 'f/' },
		{ key: 'ExposureTime', label: 'Shutter Speed', displayLabel: '' },
		{ key: 'ISOSpeedRatings', label: 'ISO', displayLabel: 'ISO ' },
		{ key: 'FocalLength', label: 'Focal Length', displayLabel: '' },
		{ key: 'Make', label: 'Camera Brand', displayLabel: '' },
		{ key: 'Model', label: 'Camera Model', displayLabel: '' },
		{ key: 'LensModel', label: 'Lens', displayLabel: '' }
	];
	
	// Camera/gear fields that should be unchecked by default
	const cameraFields = ['Make', 'Model', 'LensModel'];
	
	container.innerHTML = '';
	
	essentialFields.forEach(field => {
		const wrapper = document.createElement('div');
		wrapper.style.marginBottom = '8px';
		
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.id = `exif-${field.key}`;
		checkbox.value = field.key;
		// Check photography data by default, uncheck camera/gear data
		checkbox.checked = !cameraFields.includes(field.key);
		checkbox.style.marginRight = '8px';
		checkbox.addEventListener('change', updateExifOverlayPreview);
		
		const label = document.createElement('label');
		label.htmlFor = checkbox.id;
		label.textContent = field.label;
		label.style.fontSize = '14px';
		label.style.color = '#333';
		label.style.cursor = 'pointer';
		
		wrapper.appendChild(checkbox);
		wrapper.appendChild(label);
		container.appendChild(wrapper);
	});
}

function addExifCheckbox(container, key, value, checked = false) {
	const div = document.createElement('div');
	div.style.cssText = 'margin-bottom: 8px; display: flex; align-items: flex-start; gap: 8px;';
	
	const checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.id = `exif-${key}`;
	checkbox.checked = checked;
	checkbox.style.cssText = 'margin-top: 2px; min-width: 16px;';
	checkbox.addEventListener('change', updateExifOverlayPreview);
	
	const label = document.createElement('label');
	label.htmlFor = `exif-${key}`;
	label.style.cssText = 'cursor: pointer; font-size: 14px; line-height: 1.3;';
	
	// Get pretty name and value
	const exifInfo = getPrettyExifInfo(key, value);
	label.innerHTML = `<strong>${exifInfo.prettyName}:</strong> ${exifInfo.prettyValue}`;
	
	div.appendChild(checkbox);
	div.appendChild(label);
	container.appendChild(div);
}

function updateExifOverlayPreview() {
	const canvas = document.getElementById('exif-preview-canvas');
	const noImageMessage = document.getElementById('no-image-message');
	
	if (!canvas) {
		return;
	}
	
	// Always show canvas and hide no-image message for sample preview
	if (noImageMessage) noImageMessage.style.display = 'none';
	canvas.style.display = 'block';
	
	const ctx = canvas.getContext('2d');
	
	// Get current settings
	const borderWidth = parseInt(document.getElementById('border-width').value);
	const borderColor = document.getElementById('border-color').value;
	const fontSize = parseInt(document.getElementById('font-size').value);
	const textColor = document.getElementById('text-color').value;
	const fontFamilyElement = document.getElementById('font-family');
	const fontFamily = fontFamilyElement ? fontFamilyElement.value || 'Roboto, sans-serif' : 'Roboto, sans-serif';
	
	if (!currentImageFile) {
		// Show sample preview with placeholder image
		const sampleWidth = 400;
		const sampleHeight = 300;
		const totalWidth = sampleWidth + (borderWidth * 2);
		const totalHeight = sampleHeight + (borderWidth * 2) + fontSize + 20; // Extra space for text
		
		canvas.width = totalWidth;
		canvas.height = totalHeight;
		
		// Draw border
		ctx.fillStyle = borderColor;
		ctx.fillRect(0, 0, totalWidth, totalHeight);
		
		// Draw sample image (gray placeholder)
		ctx.fillStyle = '#f0f0f0';
		ctx.fillRect(borderWidth, borderWidth, sampleWidth, sampleHeight);
		
		// Draw placeholder text
		ctx.fillStyle = '#999';
		ctx.font = '16px Arial';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('Sample Image Preview', totalWidth / 2, borderWidth + sampleHeight / 2);
		
		// Get selected EXIF data and draw it
		const selectedExifData = getSelectedExifData();
		drawExifText(ctx, selectedExifData, totalWidth, totalHeight, borderWidth, fontSize, textColor, fontFamily);
		return;
	}
	
	// Load the image using FileReader (same approach as panorama splitter)
	const reader = new FileReader();
	reader.onload = (e) => {
		const img = new Image();
		img.onload = () => {
			// Calculate canvas size
			const maxPreviewSize = 400;
			let imageAspectRatio = img.width / img.height;
			
			// Apply selected Instagram aspect ratio if set
			if (selectedAspectRatio) {
				imageAspectRatio = selectedAspectRatio;
			}
			
			let previewWidth, previewHeight;
			if (imageAspectRatio > 1) {
				previewWidth = maxPreviewSize;
				previewHeight = maxPreviewSize / imageAspectRatio;
			} else {
				previewHeight = maxPreviewSize;
				previewWidth = maxPreviewSize * imageAspectRatio;
			}
			
			// Add border to preview dimensions
			const totalWidth = previewWidth + (borderWidth * 2);
			const totalHeight = previewHeight + (borderWidth * 2);
			
			canvas.width = totalWidth;
			canvas.height = totalHeight;
			
			// Draw border (background)
			ctx.fillStyle = borderColor;
			ctx.fillRect(0, 0, totalWidth, totalHeight);
			
			// Draw image resized to fit within the aspect ratio (no cropping)
			const originalAspectRatio = img.width / img.height;
			const targetAspectRatio = selectedAspectRatio || originalAspectRatio;
			
			let drawWidth, drawHeight, drawX, drawY;
			
			if (originalAspectRatio > targetAspectRatio) {
				// Image is wider - fit to width, center vertically
				drawWidth = previewWidth;
				drawHeight = previewWidth / originalAspectRatio;
				drawX = borderWidth;
				drawY = borderWidth + (previewHeight - drawHeight) / 2;
			} else {
				// Image is taller - fit to height, center horizontally
				drawHeight = previewHeight;
				drawWidth = previewHeight * originalAspectRatio;
				drawX = borderWidth + (previewWidth - drawWidth) / 2;
				drawY = borderWidth;
			}
			
			ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
			
			// Get selected EXIF data
			const selectedExifData = getSelectedExifData();
			
			// Draw EXIF text
			drawExifText(ctx, selectedExifData, totalWidth, totalHeight, borderWidth, fontSize, textColor, fontFamily);
		};
		
		img.onerror = () => {
			console.error('Failed to load image for preview');
		};
		
		img.src = e.target.result;
	};
	
	reader.onerror = () => {
		console.error('Failed to read image file');
	};
	
	reader.readAsDataURL(currentImageFile);
}

function getSelectedExifData() {
	const separator = document.getElementById('separator-char').value;
	const selectedItems = [];
	const checkboxes = document.querySelectorAll('#exif-checkboxes input[type="checkbox"]:checked');
	
	checkboxes.forEach(checkbox => {
		const key = checkbox.id.replace('exif-', '');
		
		// Get display value for this field
		let value = getDisplayValue(key);
		
		if (value) {
			selectedItems.push(value);
		}
	});
	
	// Return as single line joined by separator
	return selectedItems.length > 0 ? [selectedItems.join(separator)] : [];
}

function getDisplayValue(key) {
	// Sample data with technical labels only
	const sampleData = {
		'FNumber': 'ƒ/2.8',
		'ExposureTime': '1/125s',
		'ISOSpeedRatings': 'ISO 400',
		'FocalLength': '85mm',
		'Make': 'Canon',
		'Model': 'EOS R5', 
		'LensModel': 'RF 85mm f/2 Macro IS STM'
	};
	
	// Use actual EXIF data if available, otherwise sample data
	if (currentExifData && currentExifData[key]) {
		const exifInfo = getPrettyExifInfo(key, currentExifData[key]);
		let value = exifInfo.prettyValue;
		
		// Ensure value is a string before using replace
		if (typeof value !== 'string') {
			value = String(value);
		}
		
		// Apply proper technical formatting
		if (key === 'FNumber') {
			// Always use ƒ character for aperture
			value = value.replace(/^f\//, 'ƒ/');
			if (!value.startsWith('ƒ/')) {
				value = `ƒ/${value}`;
			}
		} else if (key === 'ExposureTime') {
			// Format shutter speed as proper fraction with 's' suffix
			// Remove any existing 's' suffix first
			value = value.replace(/s$/, '');
			
			// Handle decimal values (convert to fraction)
			if (value.includes('.') && !value.includes('/')) {
				const decimalValue = parseFloat(value);
				if (decimalValue >= 1) {
					// For values >= 1 second, show as decimal + "
					value = `${decimalValue}"`;
				} else {
					// For values < 1 second, convert to fraction + s
					const denominator = Math.round(1 / decimalValue);
					value = `1/${denominator}s`;
				}
			} else if (!value.includes('/') && parseFloat(value) >= 1) {
				// For whole numbers >= 1, add quote mark for seconds
				value = `${value}"`;
			} else if (value.includes('/')) {
				// If it's already a fraction, add 's' suffix
				value = `${value}s`;
			}
			// If it's already a fraction (like 1/125), keep it as is
		} else if (key === 'FocalLength') {
			// Ensure focal length has 'mm' suffix
			if (!value.endsWith('mm')) {
				value = `${value}mm`;
			}
		} else if (key === 'ISOSpeedRatings') {
			// Clean up duplicate ISO information
			// Remove any parenthetical duplicates like "ISO 160 (160)"
			value = value.replace(/\s*\(\d+\)$/, '');
			
			// Ensure ISO has 'ISO' prefix
			if (!value.startsWith('ISO')) {
				value = `ISO ${value}`;
			}
		}
		
		return value;
	}
	
	return sampleData[key] || '';
}

function drawExifText(ctx, textLines, canvasWidth, canvasHeight, borderWidth, fontSize, textColor, fontFamily) {
	if (textLines.length === 0) return;
	
	// Ensure we have a valid font family
	const safeFontFamily = fontFamily || 'Roboto, sans-serif';
	
	ctx.fillStyle = textColor;
	ctx.font = `${fontSize}px ${safeFontFamily}`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	
	const text = textLines[0]; // Single line
	const imageWidth = canvasWidth - (borderWidth * 2);
	const imageHeight = canvasHeight - (borderWidth * 2);
	
	// Position text at bottom center, scaled to image width
	const textX = canvasWidth / 2;
	const textY = borderWidth + imageHeight + (borderWidth / 2);
	
	// Scale font to fit within image width with some padding
	const maxTextWidth = imageWidth * 0.95;
	let currentFontSize = fontSize;
	ctx.font = `${currentFontSize}px ${safeFontFamily}`;
	
	while (ctx.measureText(text).width > maxTextWidth && currentFontSize > 8) {
		currentFontSize--;
		ctx.font = `${currentFontSize}px ${safeFontFamily}`;
	}
	
	ctx.fillText(text, textX, textY);
}

function downloadExifOverlay() {
	if (!currentImageFile) return;
	
	// Get current settings
	const borderWidth = parseInt(document.getElementById('border-width').value);
	const borderColor = document.getElementById('border-color').value;
	const fontSize = parseInt(document.getElementById('font-size').value);
	const textColor = document.getElementById('text-color').value;
	const fontFamily = document.getElementById('font-family').value || 'Roboto, sans-serif'; // Fallback to Roboto
	
	// Create high-resolution canvas
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	
	// Load the image using FileReader (same approach as panorama splitter)
	const reader = new FileReader();
	reader.onload = (e) => {
		const img = new Image();
		img.onload = () => {
			// Use original image dimensions
			const imageWidth = img.width;
			const imageHeight = img.height;
			
			// Scale border width proportionally for high-res
			const scaleFactor = Math.max(imageWidth, imageHeight) / 800; // Assume 800px is our reference size
			const highResBorderWidth = Math.max(borderWidth * scaleFactor, borderWidth);
			const highResFontSize = Math.max(fontSize * scaleFactor, fontSize);
			
			// Set canvas size
			canvas.width = imageWidth + (highResBorderWidth * 2);
			canvas.height = imageHeight + (highResBorderWidth * 2);
		
		// Draw border
		ctx.fillStyle = borderColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		// Draw image
		ctx.drawImage(img, highResBorderWidth, highResBorderWidth, imageWidth, imageHeight);
		
		// Get selected EXIF data
		const selectedExifData = getSelectedExifData();
		
		// Draw EXIF text
		drawExifText(ctx, selectedExifData, canvas.width, canvas.height, highResBorderWidth, highResFontSize, textColor, fontFamily);
		
		// Download the image
		canvas.toBlob(blob => {
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `exif-overlay-${Date.now()}.jpg`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 'image/jpeg', 0.95);
	};
	
	img.src = e.target.result;
};

reader.readAsDataURL(currentImageFile);
}

// Helper function for EXIF data formatting
function getPrettyExifInfo(key, value) {
	const prettyNames = {
		'Make': 'Camera Make',
		'Model': 'Camera Model',
		'LensModel': 'Lens Model',
		'DateTime': 'Date Taken',
		'FNumber': 'Aperture',
		'ExposureTime': 'Shutter Speed',
		'ISOSpeedRatings': 'ISO Speed',
		'FocalLength': 'Focal Length',
		'FocalLengthIn35mmFilm': 'Focal Length (35mm equiv.)',
		'Flash': 'Flash',
		'WhiteBalance': 'White Balance',
		'ExposureMode': 'Exposure Mode',
		'MeteringMode': 'Metering Mode',
		'ColorSpace': 'Color Space',
		'PixelXDimension': 'Image Width',
		'PixelYDimension': 'Image Height'
	};

	let prettyValue = value;
	
	// Format specific values
	if (key === 'FNumber') {
		prettyValue = `f/${value}`;
	} else if (key === 'ExposureTime') {
		if (value < 1) {
			prettyValue = `1/${Math.round(1/value)}s`;
		} else {
			prettyValue = `${value}s`;
		}
	} else if (key === 'FocalLength' || key === 'FocalLengthIn35mmFilm') {
		prettyValue = `${value}mm`;
	} else if (key === 'PixelXDimension' || key === 'PixelYDimension') {
		prettyValue = `${value}px`;
	}

	return {
		prettyName: prettyNames[key] || key,
		prettyValue: prettyValue
	};
}
