# app.py
from flask import Flask, request, jsonify
import psycopg2 # Install with: pip install psycopg2-binary

app = Flask(__name__)

# Connect to your pgAdmin database
def get_db_connection():
    return psycopg2.connect(host='localhost', database='orders', user='postgres', password='root123')

@app.route('/save-order', methods=['POST'])
def save_order():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO orders (order_id, customer_name, email, brownie_type, quantity) VALUES (%s, %s, %s, %s, %s)",
                (data['orderId'], data['customerName'], data['email'], data['brownieType'], data['quantity']))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"status": "success"}), 201

if __name__ == '__main__':
    app.run(port=5000)