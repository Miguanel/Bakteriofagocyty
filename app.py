from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
import datetime
import urllib.parse

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# --- PANCERNA KONFIGURACJA MONGODB ---
# Wpisz swoje dane. 'quote_plus' zakoduje wszystkie znaki specjalne w haśle.
USERNAME = urllib.parse.quote_plus("michauasota_db_user")
# UWAGA: PODMIEŃ PONIŻSZE DANE NA SWOJE PRAWDZIWE!
PASSWORD = urllib.parse.quote_plus("nrwD2hVwXtIh35KP")
CLUSTER = "cluster-bacteriofagocyt.dfaysme.mongodb.net"

MONGO_URI = f"mongodb+srv://{USERNAME}:{PASSWORD}@{CLUSTER}/?retryWrites=true&w=majority"

client = None
db = None
stats_col = None

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.server_info()
    print("✅ Połączono z bazą MongoDB Atlas!")
    db = client['micro_arena']
    stats_col = db['match_stats']
except Exception as e:
    print(f"❌ Błąd połączenia z bazą: {e}")
    print("Gra uruchomi się bez bazy danych (statystyki nie będą zapisywane).")

@app.after_request
def apply_js_header(response):
    if request.path.endswith('.js'):
        response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
    return response

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/save_match', methods=['POST'])
def save_match():
    if stats_col is None:
        return jsonify({"status": "error", "message": "Brak bazy"}), 500
    data = request.json
    if data:
        data['timestamp'] = datetime.datetime.utcnow()
        stats_col.insert_one(data)
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error"}), 400

@app.route('/stat')
def stats():
    if stats_col is None:
        return "<h1 style='color:red;'>Błąd: Brak połączenia z MongoDB.</h1>", 500

    total_matches = stats_col.count_documents({})
    pipeline = [{"$group": {"_id": "$winner", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    wins_data = list(stats_col.aggregate(pipeline))
    stats_summary = {"total": total_matches, "wins": {item['_id']: item['count'] for item in wins_data}}
    recent_matches = list(stats_col.find().sort('timestamp', -1).limit(15))

    return render_template('stat.html', stats=stats_summary, recent=recent_matches)

if __name__ == '__main__':
    app.run(debug=True)