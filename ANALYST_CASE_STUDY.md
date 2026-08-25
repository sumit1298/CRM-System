# AI CRM Analyst Case Study

## Business problem

Sales teams need one place to understand lead quality, pipeline health, expected revenue, and follow-up workload. This CRM turns operational records into decision-ready metrics for a sales manager.

## Key questions

- Which lead sources produce the most qualified and won opportunities?
- How much open pipeline is likely to close based on opportunity probability?
- Are won deals taking longer than lost deals to close?
- How do lead volume and value change month over month?
- Can reporting be trusted, or are duplicate and incomplete records distorting it?

## Metrics and definitions

- **Weighted forecast:** sum of open opportunity value multiplied by probability.
- **Win rate:** won leads divided by all leads for a source; use a larger sample before making budget decisions.
- **Sales-cycle duration:** `closedAt - createdAt` for closed opportunities.
- **Trend:** records grouped by their creation month within the selected date range.

## Analyst workflow

1. Filter the Analytics page by a reporting period.
2. Compare source funnel counts and win rates.
3. Compare open pipeline with weighted forecast.
4. Review win/loss cycle duration for process bottlenecks.
5. Resolve data-quality exceptions before presenting results.
6. Export the underlying CSV files for Power BI, Tableau, or Excel.

## Recommendations to demonstrate

Use the report to recommend shifting campaign spend toward sources with a strong qualified-to-won rate, improving probability definitions when forecast variance is high, and making company, phone, and close dates mandatory when quality exceptions increase.

## SQL / BI extension

The MongoDB report endpoint is the production implementation. For a BI portfolio companion, export the CSV files and reproduce the metrics in Power BI or Tableau. Add a data dictionary, a star schema with `fact_opportunities`, `fact_leads`, and date/source dimensions, and document each measure and filter.