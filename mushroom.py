from flask import Flask, render_template, request, jsonify
import requests
import os
import io
import base64
from PIL import Image, ImageDraw, ImageFont

app = Flask(__name__)

# Roboflow API configuration
# Tip: Set these in Vercel Environment Variables instead of hardcoding
ROBOFLOW_API_URL = "https://detect.roboflow.com/mushroom-w7ucu/13"
ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY", "LpkUpv6XAkCrQs0L9R8O")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/history')
def history():
    return render_template('history.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    try:
        # Read the uploaded file into memory
        img_bytes = file.read()
        
        # 1. Perform inference using Roboflow
        predictions = get_roboflow_predictions(img_bytes)

        # 2. Overlay predictions (returns a base64 string)
        result_base64 = overlay_predictions(img_bytes, predictions)

        # 3. Count classes
        counts = count_prediction_classes(predictions)
        total_mushrooms = sum(counts.values())

        return jsonify({
            "success": True,
            "processed_image": f"data:image/png;base64,{result_base64}",
            "ready": counts.get("READY", 0),
            "notReady": counts.get("NOT_READY", 0),
            "overdue": counts.get("OVERDUE", 0),
            "totalMushrooms": total_mushrooms
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_roboflow_predictions(image_bytes):
    """Send image bytes to Roboflow."""
    response = requests.post(
        f"{ROBOFLOW_API_URL}?api_key={ROBOFLOW_API_KEY}",
        files={"file": ("image.jpg", image_bytes, "image/jpeg")}
    )
    response.raise_for_status()
    return response.json()

def overlay_predictions(image_bytes, predictions):
    """Draws boxes on image in memory and returns base64 string."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    # Use default font
    try:
        font = ImageFont.load_default()
    except:
        font = None

    for prediction in predictions.get("predictions", []):
        # Roboflow sometimes returns 'points' for polygons or 'x,y,width,height' for boxes
        if "points" in prediction:
            points = [(p["x"], p["y"]) for p in prediction["points"]]
        else:
            # Fallback for bounding boxes
            x, y, w, h = prediction['x'], prediction['y'], prediction['width'], prediction['height']
            points = [(x-w/2, y-h/2), (x+w/2, y-h/2), (x+w/2, y+h/2), (x-w/2, y+h/2)]

        label = prediction["class"]
        color = {
            "READY": (72, 211, 138, 128),
            "NOT_READY": (255, 215, 0, 128),
            "OVERDUE": (255, 0, 0, 128),
        }.get(label, (0, 0, 0, 128))

        draw.polygon(points, fill=color, outline=color[:3])
        if points:
            draw.text((points[0][0], points[0][1] - 10), label, fill=(255, 255, 255), font=font)

    # Composite and save to buffer
    combined = Image.alpha_composite(image, overlay).convert("RGB")
    buffer = io.BytesIO()
    combined.save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def count_prediction_classes(predictions):
    class_counts = {}
    for prediction in predictions.get("predictions", []):
        label = prediction["class"]
        class_counts[label] = class_counts.get(label, 0) + 1
    return class_counts

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3000)
