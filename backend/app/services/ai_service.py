import os
import sys
import io
import traceback
import json
import pandas as pd
import numpy as np
import requests
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SYSTEM_PROMPT = """
You are a world-class Data Scientist and Business Intelligence Assistant.
You have access to a pandas DataFrame named `df` loaded from an uploaded CSV file.

Here is the structural metadata of the DataFrame:
- Columns and types: {dtypes}
- Null counts: {null_counts}
- DataFrame Shape: {shape}
- Preview (first 3 rows):
{preview}

Your goal is to write a Python script to answer the user's question: "{question}"

You MUST follow these strict rules:
1. ONLY return executable Python code inside a single ```python and ``` code block. Do NOT write explanations, warnings, introduction, or conclusion text. The response must contain only the code block.
2. The code should do all necessary calculations and print the insights, results, or data tables using standard `print()`. 
3. Use markdown in your print statements (e.g., headers like "### Heading", bullet points, or output DataFrames as markdown tables using `df.to_markdown(index=False)`). This makes the output look highly professional.
4. If the user's query asks for a chart, or if visualizing the data would be highly suitable/informative, create a Plotly figure named `fig` using `plotly.express` (imported as `px`) or `plotly.graph_objects` (imported as `go`). Do NOT call `fig.show()`.
5. If no chart is relevant, do not define `fig` or set `fig = None`.
6. Use dark/glassmorphic templates for the Plotly charts to make them look premium. For example, use:
   `fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")`
7. Do NOT attempt to read, write, or load any files. The DataFrame is ALREADY loaded and available as the variable `df`.
8. Ensure all column names are referenced correctly according to the metadata. Handle potential missing/null values safely.
9. Keep output concise but extremely informative.

Example Output structure:
```python
# Analyze data
summary = df.groupby("Category")["Sales"].sum().reset_index()
print("### Sales Summary by Category")
print(summary.to_markdown(index=False))

# Plot
fig = px.bar(summary, x="Category", y="Sales", title="Sales by Category")
fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
```
"""

def call_gemini_api(messages: list) -> str:
    """Calls Google's Gemini API via REST (completely free tier available)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment.")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    # Map OpenAI chat messages to Gemini REST format
    gemini_contents = []
    for msg in messages:
        role = msg["role"]
        content = msg["content"]
        
        if role == "system":
            gemini_contents.append({"role": "user", "parts": [{"text": f"System Directive: {content}"}]})
        elif role == "user":
            gemini_contents.append({"role": "user", "parts": [{"text": content}]})
        elif role == "assistant":
            gemini_contents.append({"role": "model", "parts": [{"text": content}]})
            
    payload = {
        "contents": gemini_contents,
        "generationConfig": {
            "temperature": 0.1
        }
    }
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Gemini API returned status {response.status_code}: {response.text}")
        
    res_json = response.json()
    try:
        return res_json['candidates'][0]['content']['parts'][0]['text']
    except Exception:
        raise Exception(f"Failed to parse Gemini response: {res_json}")

def call_openai_api(messages: list) -> str:
    """Calls OpenAI's GPT-4o API."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in environment.")
    
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.1
    )
    return response.choices[0].message.content

def execute_code(code_str: str, df: pd.DataFrame):
    """Executes the generated Python code block and captures output/Plotly charts."""
    import plotly.express as px
    import plotly.graph_objects as go
    
    # Capture stdout
    stdout_buffer = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = stdout_buffer
    
    local_vars = {
        'df': df,
        'pd': pd,
        'np': np,
        'px': px,
        'go': go,
        'fig': None
    }
    
    error = None
    cleaned_code = ""
    try:
        # Clean up markdown styling from LLM response if present
        if "```python" in code_str:
            cleaned_code = code_str.split("```python")[1].split("```")[0].strip()
        elif "```" in code_str:
            cleaned_code = code_str.split("```")[1].split("```")[0].strip()
        else:
            cleaned_code = code_str.strip()
            
        exec(cleaned_code, globals(), local_vars)
    except Exception as e:
        error = traceback.format_exc()
    finally:
        sys.stdout = old_stdout
        
    captured_stdout = stdout_buffer.getvalue()
    fig = local_vars.get('fig')
    fig_json = None
    
    if fig is not None:
        try:
            fig_json = json.loads(fig.to_json())
        except Exception as e:
            error = f"Error serializing Plotly figure to JSON: {e}\n{error or ''}"
            
    return captured_stdout, fig_json, cleaned_code, error

def ask_ai(question: str, df: pd.DataFrame) -> dict:
    """Invokes AI agent to write analysis code, runs it, and self-heals tracebacks."""
    if df is None or len(df) == 0:
        return {
            "answer": "No dataset uploaded yet.",
            "chart": None,
            "code": "",
            "success": False
        }
        
    # Check what API keys are configured
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    
    key_guide = """### 🔑 Free API Key Configuration Required

The current OpenAI API key has **exceeded its quota** or is invalid. 

To run this AI BI Copilot completely for **free**, you can use Google's Gemini API:
1. Go to **[Google AI Studio](https://aistudio.google.com/)** and log in with your Google account.
2. Click **Create API Key** and generate a free key.
3. Open the file **`backend/.env`** in your project folder.
4. Replace the content with:
   ```env
   GEMINI_API_KEY=your_new_free_api_key_here
   ```
5. Save the file. The FastAPI backend will hot-reload automatically, and you can resume querying!"""

    if not has_gemini and not has_openai:
        return {
            "answer": key_guide,
            "chart": None,
            "code": "",
            "success": False
        }
        
    # Determine which engine to use (default to Gemini if available since it's free)
    engine = "gemini" if has_gemini else "openai"

    # Get metadata for LLM prompt context
    dtypes = df.dtypes.astype(str).to_dict()
    null_counts = df.isnull().sum().to_dict()
    shape = df.shape
    preview = df.head(3).to_string()
    
    prompt = SYSTEM_PROMPT.format(
        dtypes=dtypes,
        null_counts=null_counts,
        shape=shape,
        preview=preview,
        question=question
    )
    
    messages = [
        {"role": "system", "content": "You are a professional Python data analyst. You write only executable code blocks inside python Markdown blocks."},
        {"role": "user", "content": prompt}
    ]
    
    max_retries = 3
    retry_count = 0
    last_error = None
    executed_code = ""
    
    while retry_count < max_retries:
        try:
            # Query the selected API engine
            if engine == "gemini":
                code_candidate = call_gemini_api(messages)
            else:
                code_candidate = call_openai_api(messages)
                
            # Execute the generated code
            captured_stdout, fig_json, cleaned_code, error = execute_code(code_candidate, df)
            executed_code = cleaned_code
            
            if error is None:
                return {
                    "answer": captured_stdout or "Analysis complete (no textual output).",
                    "chart": fig_json,
                    "code": executed_code,
                    "success": True
                }
            
            # Record traceback and send back to self-heal
            last_error = error
            messages.append({"role": "assistant", "content": code_candidate})
            messages.append({
                "role": "user",
                "content": f"The script failed during execution with the following traceback:\n\n{error}\n\nPlease analyze this error, adjust the code accordingly, and output the complete corrected script."
            })
            retry_count += 1
            
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower():
                return {
                    "answer": key_guide,
                    "chart": None,
                    "code": "",
                    "success": False
                }
            return {
                "answer": f"API request failed: {error_str}",
                "chart": None,
                "code": executed_code,
                "success": False
            }
            
    return {
        "answer": f"Analysis failed after {max_retries} attempts to self-heal code.\n\n### Last Error Traceback\n```\n{last_error}\n```",
        "chart": None,
        "code": executed_code,
        "success": False
    }