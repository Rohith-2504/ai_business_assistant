import matplotlib

# IMPORTANT FIX
matplotlib.use("Agg")

import matplotlib.pyplot as plt


def generate_chart(df):

    numeric_columns = df.select_dtypes(include=['number']).columns

    if len(numeric_columns) == 0:
        return None

    column = numeric_columns[0]

    plt.figure(figsize=(8, 5))

    df[column].head(20).plot(kind='bar')

    chart_path = "app/uploads/chart.png"

    plt.title(f"{column} Visualization")

    plt.tight_layout()

    plt.savefig(chart_path)

    plt.close()

    return chart_path