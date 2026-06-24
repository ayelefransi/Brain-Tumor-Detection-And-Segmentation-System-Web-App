# Use an official lightweight Python image
FROM python:3.10-slim

# Set up a new user named "user" with user ID 1000
# Hugging Face Spaces requires the app to run as user 1000
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY --chown=user backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the backend application and the model file
COPY --chown=user backend/ ./backend/
COPY --chown=user best_model.pt .

# Change working directory to backend so relative paths (like ../best_model.pt) work correctly
WORKDIR /app/backend

# Expose port 7860 (Hugging Face Spaces default port)
EXPOSE 7860

# Start the FastAPI application on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
