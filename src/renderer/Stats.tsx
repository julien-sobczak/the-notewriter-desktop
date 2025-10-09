/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useContext } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveCalendar } from '@nivo/calendar';
import { ResponsiveSunburst } from '@nivo/sunburst';
import { RepositoryRefConfig, StatConfig, MediaDirStat } from '../shared/Model';
import { ConfigContext } from './ConfigContext';
import Loader from './Loader';

// Helper function to generate a slug from a string
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper function to generate a grayscale color based on value position
function color(value: number, minValue: number, maxValue: number): string {
  if (maxValue === minValue) {
    return 'hsl(0, 0%, 50%)';
  }
  const position = (value - minValue) / (maxValue - minValue);
  const lightness = 90 - position * 60; // Range from 90% (light) to 30% (dark)
  return `hsl(0, 0%, ${lightness}%)`;
}

// PieChart component
function PieChart({ name, data }: { name: string; data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '400px', padding: '20px' }}>
        <h3>{name}</h3>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div style={{ height: '400px', padding: '20px' }}>
      <h3>{name}</h3>
      <ResponsivePie
        data={data}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        enableArcLinkLabels
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
      />
    </div>
  );
}

// MapChart component
function MapChart({ name, data }: { name: string; data: any[] }) {
  // For now, we'll skip the map implementation as it requires world topology data
  // Return a placeholder
  return (
    <div style={{ height: '400px', padding: '20px' }}>
      <h3>{name}</h3>
      <p>Map visualization requires additional world topology data</p>
      <p>Data: {JSON.stringify(data.slice(0, 3))}...</p>
    </div>
  );
}

// TimelineChart component
function TimelineChart({ name, data }: { name: string; data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '400px', padding: '20px' }}>
        <h3>{name}</h3>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div style={{ height: '400px', padding: '20px' }}>
      <h3>{name}</h3>
      <ResponsiveLine
        data={data}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
          stacked: false,
          reverse: false,
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'date',
          legendOffset: 36,
          legendPosition: 'middle',
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'count',
          legendOffset: -40,
          legendPosition: 'middle',
        }}
        pointSize={10}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh
      />
    </div>
  );
}

// CalendarChart component
function CalendarChart({ name, data }: { name: string; data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '400px', padding: '20px' }}>
        <h3>{name}</h3>
        <p>No data available</p>
      </div>
    );
  }

  // Find min and max years from data
  const years = data.map((d) => new Date(d.day).getFullYear());
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const from = `${minYear}-01-01`;
  const to = `${maxYear}-12-31`;

  return (
    <div style={{ height: '400px', padding: '20px' }}>
      <h3>{name}</h3>
      <ResponsiveCalendar
        data={data}
        from={from}
        to={to}
        emptyColor="#eeeeee"
        colors={['#61cdbb', '#97e3d5', '#e8c1a0', '#f47560']}
        margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
        yearSpacing={40}
        monthBorderColor="#ffffff"
        dayBorderWidth={2}
        dayBorderColor="#ffffff"
      />
    </div>
  );
}

// SunburstChart component
function SunburstChart({ name, data }: { name: string; data: any }) {
  if (!data || !data.children || data.children.length === 0) {
    return (
      <div style={{ height: '400px', padding: '20px' }}>
        <h3>{name}</h3>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div style={{ height: '600px', padding: '20px' }}>
      <h3>{name}</h3>
      <ResponsiveSunburst
        data={data}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        id="id"
        value="value"
        cornerRadius={2}
        borderWidth={1}
        borderColor={{ theme: 'background' }}
        colors={{ scheme: 'nivo' }}
        childColor={{ from: 'color', modifiers: [['brighter', 0.1]] }}
        enableArcLabels
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 1.5]] }}
      />
    </div>
  );
}

function Stats() {
  const { config } = useContext(ConfigContext);
  const staticConfig = config.static;

  const [loading, setLoading] = useState<boolean>(true);
  const [objectCountData, setObjectCountData] = useState<any[]>([]);
  const [noteTypeData, setNoteTypeData] = useState<any[]>([]);
  const [mediaDiskUsageData, setMediaDiskUsageData] = useState<any>(null);
  const [customStats, setCustomStats] = useState<
    Array<{
      config: StatConfig;
      data: any;
    }>
  >([]);

  useEffect(() => {
    const loadStatistics = async () => {
      setLoading(true);

      // Get selected repository slugs
      const selectedRepositorySlugs = staticConfig.repositories
        .filter((repository: RepositoryRefConfig) => repository.selected)
        .map((repository: RepositoryRefConfig) => repository.slug);

      try {
        // Load default graphs

        // 1. Object Count
        const objectCounts = await window.electron.countObjects(
          selectedRepositorySlugs,
        );
        const values = Array.from(objectCounts.values());
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const objectCountChartData = Array.from(objectCounts.entries()).map(
          ([kind, count]) => ({
            id: kind,
            label: kind,
            value: count,
            color: color(count, minVal, maxVal),
          }),
        );
        setObjectCountData(objectCountChartData);

        // 2. Note Type Count
        const noteTypeStats = await window.electron.getNoteStatistics(
          selectedRepositorySlugs,
          '',
          ['type'],
        );
        const noteTypeValues = noteTypeStats.map((s) => Number(s[1]));
        const noteTypeMin = Math.min(...noteTypeValues);
        const noteTypeMax = Math.max(...noteTypeValues);
        const noteTypeChartData = noteTypeStats.map(([label, count]) => ({
          id: slugify(String(label)),
          label: String(label),
          value: Number(count),
          color: color(Number(count), noteTypeMin, noteTypeMax),
        }));
        setNoteTypeData(noteTypeChartData);

        // 3. Media Disk Usage
        const mediaDirStats: MediaDirStat[] =
          await window.electron.getMediasDiskUsage(selectedRepositorySlugs);

        // Build sunburst data structure
        const rootNode: any = {
          id: '.',
          children: [],
        };

        // Group by top-level directory
        const topLevelDirs: Map<string, MediaDirStat[]> = new Map();
        const rootFiles: MediaDirStat[] = [];

        for (const stat of mediaDirStats) {
          if (stat.relativePath === '/') {
            rootFiles.push(stat);
          } else {
            const parts = stat.relativePath.split('/');
            const topDir = parts[0];
            if (!topLevelDirs.has(topDir)) {
              topLevelDirs.set(topDir, []);
            }
            topLevelDirs.get(topDir)!.push(stat);
          }
        }

        // Add root files
        if (rootFiles.length > 0) {
          const rootSize = rootFiles.reduce((sum, s) => sum + s.size, 0);
          rootNode.children.push({
            id: '/',
            value: rootSize,
          });
        }

        // Add top-level directories
        for (const [topDir, stats] of topLevelDirs) {
          const dirNode: any = {
            id: topDir,
            children: [],
          };

          for (const stat of stats) {
            dirNode.children.push({
              id: stat.relativePath,
              value: stat.size,
            });
          }

          rootNode.children.push(dirNode);
        }

        setMediaDiskUsageData(rootNode);

        // Load custom stats from config
        let customStatsData: Array<{ config: StatConfig; data: any }> = [];
        if (staticConfig.stats) {
          const statPromises = staticConfig.stats.map(async (statConfig) => {
            const repositories =
              statConfig.repository.length > 0
                ? statConfig.repository
                : selectedRepositorySlugs;

            const rawData = await window.electron.getNoteStatistics(
              repositories,
              statConfig.query,
              statConfig.groupBy,
              statConfig.value,
            );

            let chartData: any;

            if (statConfig.visualization === 'pie') {
              const vals = rawData.map((s) => Number(s[1]));
              const minV = Math.min(...vals);
              const maxV = Math.max(...vals);
              chartData = rawData.map(([label, count]) => ({
                id: slugify(String(label)),
                label: String(label),
                value: Number(count),
                color: color(Number(count), minV, maxV),
              }));
            } else if (statConfig.visualization === 'map') {
              chartData = rawData.map(([label, count]) => {
                const mappedId = statConfig.mapping
                  ? statConfig.mapping[String(label)]
                  : String(label);
                return {
                  id: mappedId || String(label),
                  value: Number(count),
                };
              });
            } else if (statConfig.visualization === 'timeline') {
              chartData = [
                {
                  id: slugify(statConfig.name),
                  data: rawData.map(([label, count]) => ({
                    x: String(label),
                    y: Number(count),
                  })),
                },
              ];
            } else if (statConfig.visualization === 'calendar') {
              chartData = rawData.map(([label, count]) => ({
                day: String(label),
                value: Number(count),
              }));
            }

            return {
              config: statConfig,
              data: chartData,
            };
          });

          customStatsData = await Promise.all(statPromises);
        }

        setCustomStats(customStatsData);
      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, []);

  return (
    <div className="Stats Screen">
      {loading && <Loader />}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Default Graphs */}
          <PieChart name="Objects" data={objectCountData} />
          <PieChart name="Note Types" data={noteTypeData} />
          <SunburstChart name="Media Storage" data={mediaDiskUsageData} />

          {/* Custom Stats from Config */}
          {customStats.map((stat) => {
            const key = `${stat.config.name}-${stat.config.visualization}`;
            if (stat.config.visualization === 'pie') {
              return (
                <PieChart key={key} name={stat.config.name} data={stat.data} />
              );
            }
            if (stat.config.visualization === 'map') {
              return (
                <MapChart key={key} name={stat.config.name} data={stat.data} />
              );
            }
            if (stat.config.visualization === 'timeline') {
              return (
                <TimelineChart
                  key={key}
                  name={stat.config.name}
                  data={stat.data}
                />
              );
            }
            if (stat.config.visualization === 'calendar') {
              return (
                <CalendarChart
                  key={key}
                  name={stat.config.name}
                  data={stat.data}
                />
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

export default Stats;
