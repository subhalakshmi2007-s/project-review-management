#!/usr/bin/env bash
set -e   # stop on any error

echo "====== Step 1: Build React frontend ======"
cd frontend
npm install
npm run build
cd ..

echo "====== Step 2: Install Python dependencies ======"
cd backend
pip install -r requirements.txt
cd ..

echo "====== Build complete ======"
