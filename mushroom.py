from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from PIL import Image, ImageDraw, ImageFont
import requests
import os
import base64

app = Flask(__name__)

UPLOAD_FOLDER = '/tmp/uploads'
RESULT_FOLDER = '/tmp/results'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULT_FOLDER'] = RESULT_FOLDER

ROBOFLOW_API_URL = "https://detect.roboflow.com/mushroom-w7ucu/13"
ROBOFLOW_API_KEY = "LpkUpv6XAkCrQs0L9R8O"

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

    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        try:
            predictions = get_roboflow_predictions(filepath)
            result_path = overlay_predictions(filepath, predictions)
            counts = count_prediction_classes(predictions)
            total_mushrooms = sum(counts.values())

            with open(result_path, "rb") as img_file:
                processed_image_base64 = base64.b64encode(img_file.read()).decode('utf-8')

            with open(filepath, "rb") as img_file:
                original_image_base64 = base64.b64encode(img_file.read()).decode('utf-8')

            return jsonify({
                "original_image": original_image_base64,
                "processed_image": processed_image_base64,
                "ready": counts.get("READY", 0),
                "notReady": counts.get("NOT_READY", 0),
                "overdue": counts.get("OVERDUE", 0),
                "totalMushrooms": total_mushrooms
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "File processing failed"}), 500

def get_roboflow_predictions(image_path):
    with open(image_path, "rb") as image_file:
        response = requests.post(
            f"{ROBOFLOW_API_URL}?api_key={ROBOFLOW_API_KEY}",
            files={"file": image_file}
        )
    response.raise_for_status()
    return response.json()

def overlay_predictions(image_path, predictions):
    image = Image.open(image_path).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)
    font = ImageFont.load_default()

    for prediction in predictions.get("predictions", []):
        points = [(p["x"], p["y"]) for p in prediction["points"]]
        label = prediction["class"]

        color = {
            "READY": (72, 211, 138, 128),
            "NOT_READY": (255, 215, 0, 128),
            "OVERDUE": (255, 0, 0, 128),
        }.get(label, (0, 0, 0, 128))

        draw.polygon(points, fill=color, outline=color[:3])
        label_position = (points[0][0], points[0][1] - 20)
        draw.text(label_position, label, fill=(255, 255, 255), font=font)

    result = Image.alpha_composite(image, overlay)
    result_path = os.path.join(app.config['RESULT_FOLDER'], os.path.basename(image_path))
    result.save(result_path, format="PNG")
    return result_path

def count_prediction_classes(predictions):
    class_counts = {}
    for prediction in predictions.get("predictions", []):
        label = prediction["class"]
        class_counts[label] = class_counts.get(label, 0) + 1
    return class_counts

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=False)
