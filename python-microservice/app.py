from flask import Flask, request, jsonify
from flask_cors import CORS
import pytesseract
from PIL import Image
import io
import base64
from colorthief import ColorThief
import tempfile
import os

app = Flask(__name__)
CORS(app)

# Configure pytesseract path if needed (uncomment and adjust for your system)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

@app.route('/analyze-logo', methods=['POST'])
def analyze_logo():
    try:
        # Get the uploaded file
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Read the image
        image_data = file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Extract text using OCR
        try:
            extracted_text = pytesseract.image_to_string(image).strip()
            # Clean up the text - take first meaningful line
            lines = [line.strip() for line in extracted_text.split('\n') if line.strip()]
            brand_name = lines[0] if lines else "Your Brand"
        except Exception as e:
            print(f"OCR Error: {e}")
            brand_name = "Your Brand"
        
        # Extract dominant colors
        try:
            # Save image temporarily for ColorThief
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
                image.save(tmp_file.name, 'JPEG')
                
                # Extract colors
                color_thief = ColorThief(tmp_file.name)
                dominant_color = color_thief.get_color(quality=1)
                palette = color_thief.get_palette(color_count=3, quality=1)
                
                # Clean up temp file
                os.unlink(tmp_file.name)
                
                # Convert RGB tuples to hex
                def rgb_to_hex(rgb):
                    return "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])
                
                colors = [rgb_to_hex(color) for color in palette]
                
        except Exception as e:
            print(f"Color extraction error: {e}")
            colors = ["#3B82F6", "#10B981", "#F59E0B"]  # Default colors
        
        return jsonify({
            'brand_name': brand_name,
            'colors': colors,
            'dominant_color': colors[0] if colors else "#3B82F6"
        })
        
    except Exception as e:
        print(f"Error processing image: {e}")
        return jsonify({'error': 'Failed to process image'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5001)