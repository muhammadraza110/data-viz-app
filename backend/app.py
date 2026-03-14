from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
from datetime import datetime
import json

app = Flask(__name__)
CORS(app, origins="*", allow_headers="*", methods="*")

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def analyze_data(df):
    """Analyze dataframe and generate insights"""
    analysis = {
        'summary': {},
        'statistics': {},
        'charts_data': {},
        'kpis': {},
        'insights': []
    }
    
    # Basic summary
    analysis['summary'] = {
        'total_rows': len(df),
        'total_columns': len(df.columns),
        'columns': list(df.columns),
        'missing_values': df.isnull().sum().to_dict(),
        'data_types': df.dtypes.astype(str).to_dict()
    }
    
    # Separate numeric and categorical columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
    
    # Numeric statistics
    if numeric_cols:
        stats = df[numeric_cols].describe().to_dict()
        analysis['statistics']['numeric'] = stats
        
        # KPIs for numeric columns
        for col in numeric_cols[:5]:  # Limit to first 5 numeric columns
            analysis['kpis'][f'{col}_sum'] = float(df[col].sum())
            analysis['kpis'][f'{col}_avg'] = float(df[col].mean())
            analysis['kpis'][f'{col}_max'] = float(df[col].max())
            analysis['kpis'][f'{col}_min'] = float(df[col].min())
    
    # Categorical statistics
    if categorical_cols:
        cat_stats = {}
        for col in categorical_cols[:5]:  # Limit to first 5 categorical columns
            value_counts = df[col].value_counts().head(10).to_dict()
            cat_stats[col] = value_counts
        analysis['statistics']['categorical'] = cat_stats
    
    # Chart data preparation
    
    # 1. Bar chart - Top 10 values of first categorical column
    if categorical_cols:
        first_cat = categorical_cols[0]
        top_values = df[first_cat].value_counts().head(10)
        analysis['charts_data']['bar_chart'] = {
            'labels': top_values.index.tolist(),
            'values': top_values.values.tolist(),
            'title': f'Top 10 {first_cat}'
        }
    
    # 2. Line chart - First numeric column over index/time
    if numeric_cols:
        first_numeric = numeric_cols[0]
        # Sample data if too large
        sample_size = min(100, len(df))
        sample_df = df.sample(n=sample_size).sort_index()
        
        analysis['charts_data']['line_chart'] = {
            'labels': list(range(len(sample_df))),
            'values': sample_df[first_numeric].tolist(),
            'title': f'{first_numeric} Trend'
        }
    
    # 3. Pie chart - Distribution of first categorical column
    if categorical_cols:
        first_cat = categorical_cols[0]
        pie_data = df[first_cat].value_counts().head(5)
        analysis['charts_data']['pie_chart'] = {
            'labels': pie_data.index.tolist(),
            'values': pie_data.values.tolist(),
            'title': f'{first_cat} Distribution'
        }
    
    # 4. Multiple numeric columns for comparison
    if len(numeric_cols) >= 2:
        analysis['charts_data']['multi_bar_chart'] = {
            'labels': list(range(min(20, len(df)))),
            'datasets': []
        }
        for col in numeric_cols[:3]:  # First 3 numeric columns
            analysis['charts_data']['multi_bar_chart']['datasets'].append({
                'label': col,
                'data': df[col].head(20).tolist()
            })
    
    # Generate insights
    if numeric_cols:
        for col in numeric_cols[:3]:
            mean_val = df[col].mean()
            max_val = df[col].max()
            min_val = df[col].min()
            analysis['insights'].append(
                f"'{col}' ranges from {min_val:.2f} to {max_val:.2f} with an average of {mean_val:.2f}"
            )
    
    if categorical_cols:
        for col in categorical_cols[:2]:
            unique_count = df[col].nunique()
            most_common = df[col].value_counts().index[0]
            analysis['insights'].append(
                f"'{col}' has {unique_count} unique values. Most common: '{most_common}'"
            )
    
    # Data quality insight
    missing_pct = (df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
    analysis['insights'].append(
        f"Data completeness: {100 - missing_pct:.1f}% ({missing_pct:.1f}% missing values)"
    )
    
    return analysis

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload and analysis"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        allowed_extensions = {'csv', 'xlsx', 'xls'}
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        
        if file_ext not in allowed_extensions:
            return jsonify({'error': 'Invalid file type. Please upload CSV or Excel file'}), 400
        
        # Save file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{file.filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Read file
        if file_ext == 'csv':
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath)
        
        # Analyze data
        analysis = analyze_data(df)
        
        # Add preview data (first 10 rows)
        preview_data = df.head(10).to_dict('records')
        # Convert any NaN to None for JSON serialization
        preview_data = json.loads(json.dumps(preview_data, default=str))
        analysis['preview'] = preview_data
        
        return jsonify({
            'success': True,
            'message': 'File analyzed successfully',
            'data': analysis
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'API is running'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)