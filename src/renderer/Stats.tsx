/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useContext } from 'react';
import { Chart } from 'react-google-charts';
import { Statistics, RepositoryRefConfig } from '../shared/Model';
import { ConfigContext } from './ConfigContext';
import Loader from './Loader';
import { nationalities } from './world';

function Stats() {
  const { config } = useContext(ConfigContext);
  const staticConfig = config.static;

  const [statistics, setStatistics] = useState<Statistics | null>(null);

  useEffect(() => {
    // Retrieve the statistics based on currently selected repositories
    const selectedRepositorySlugs = staticConfig.repositories
      .filter((repository: RepositoryRefConfig) => repository.selected)
      .map((repository: RepositoryRefConfig) => repository.slug);

    const getStatistics = async () => {
      const stats = await window.electron.getStatistics(
        selectedRepositorySlugs,
      );
      console.log(stats);
      setStatistics(stats);
    };

    getStatistics();
  }, []);

  const nationalityChartData: any = [['Country', 'Popularity']];
  // Example: https://www.react-google-charts.com/examples/geo-chart
  // Config: https://developers.google.com/chart/interactive/docs/gallery/geochart
  //     export const data = [
  //       ['Country', 'Popularity'],
  //       ['United States', 300],
  //       ['France', 600],
  //       ...
  //     ];

  const kindChartData: any = [['Kind', 'Count']];
  // Example: https://www.react-google-charts.com/examples/pie-chart
  //     export const data = [
  //       ["Task", "Hours per Day"],
  //       ["Work", 11],
  //       ["Eat", 2],
  //       ...
  //     ];

  if (statistics) {
    // Format data for nationality chart
    for (const [nationality, count] of statistics.countNotesPerNationality) {
      if (!nationalities.has(nationality)) {
        console.info(`Unknown country for nationality ${nationality}`);
      }
      const country = nationalities.get(nationality);
      if (country && count) {
        nationalityChartData.push([country, count]);
      }
    }

    // Format data for kind chart
    for (const [kind, count] of statistics.countNotesPerType) {
      if (kind && count) {
        kindChartData.push([kind, count]);
      }
    }
  }

  return (
    <div className="Stats Screen">
      <h1>Stats!</h1>
      {!statistics && <Loader />}
      {statistics && (
        <div>
          <Chart
            chartType="GeoChart"
            width="100%"
            height="400px"
            data={nationalityChartData}
            options={{
              // colorAxis: { colors: ['white', 'gray'] }, // B&W
              legend: 'none',
            }}
          />
          <Chart
            chartType="PieChart"
            width="100%"
            height="400px"
            data={kindChartData}
            options={{}}
          />
        </div>
      )}
    </div>
  );
}

export default Stats;
