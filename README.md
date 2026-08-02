# Examify Project Notes

## ML Demo Data and Evaluation

Run these commands from the `backend` folder:

```bash
cd backend
```

Seed demo ML data into the database:

```bash
npm run demo:seed-ml
```

Generate/evaluate ML report metrics:

```bash
npm run ml:evaluate-report
```

The evaluation command generates Random Forest and KNN metrics, including accuracy, precision, recall, F1-score, confusion matrices, and ROC curve files.

Generated report files are saved in:

```text
backend/ml/reports
```

Useful generated files include:

```text
ml-evaluation-summary.txt
ml-evaluation-report.json
random-forest-confusion-matrix.svg
random-forest-roc-curve.svg
knn-confusion-matrix.svg
knn-roc-curve.svg
```

## ML Algorithms Used

- Random Forest Regression predicts the student's final exam percentage.
- K-Nearest Neighbors Classification predicts the student's risk category and dashboard grouping.
