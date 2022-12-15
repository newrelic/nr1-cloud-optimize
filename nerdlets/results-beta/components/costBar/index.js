import React from 'react';

export default function CostBar(props) {
  const { type } = props;

  const workloadColors = [
    'rgba(13, 54, 196, 0.1)',
    'rgba(13, 54, 196, 0.3)',
    'rgba(13, 54, 196, 0.6)',
    'rgba(13, 54, 196, 0.8)',
    '#0D36C4'
  ];

  const serviceColors = [
    'rgba(107, 37, 196, 0.1)',
    'rgba(107, 37, 196, 0.3)',
    'rgba(107, 37, 196, 0.6)',
    'rgba(107, 37, 196, 0.8)',
    '#6B25C4'
  ];

  const colors = type === 'service' ? serviceColors : workloadColors;

  return (
    <div
      className="cost-bar-table"
      style={{ display: 'inline-block', marginTop: '-4px' }}
    >
      <table className="cost-bar-table">
        <tr className="cost-bar-table-row-numbers">
          <td colSpan={7} style={{ textAlign: 'center' }}>
            % of {type === 'service' ? 'service' : 'workload'} cost
          </td>
        </tr>
        <tr className="cost-bar-table-row">
          <td />
          <td style={{ backgroundColor: colors[0] }} />
          <td style={{ backgroundColor: colors[1] }} />
          <td style={{ backgroundColor: colors[2] }} />
          <td style={{ backgroundColor: colors[3] }} />
          <td style={{ backgroundColor: colors[4] }} />
          <td />
        </tr>
        <tr
          className="cost-bar-table-row-numbers"
          style={{ textAlign: 'center' }}
        >
          <td />
          <td style={{ paddingLeft: '0px' }}>0</td>
          <td style={{ paddingLeft: '0px' }}>
            <span style={{ marginLeft: '-8px' }}>20</span>
          </td>
          <td style={{ paddingLeft: '0px' }}>
            <span style={{ marginLeft: '-8px' }}>40</span>
          </td>
          <td style={{ paddingLeft: '0px' }}>
            <span style={{ marginLeft: '-8px' }}>60</span>
          </td>
          <td style={{ paddingLeft: '0px' }}>
            <span style={{ marginLeft: '-8px' }}>80</span>
          </td>
          <td style={{ textAlign: 'left', paddingLeft: '0px' }}>
            <span style={{ marginLeft: '-10px' }}>100</span>
          </td>
          <td />
        </tr>
      </table>
    </div>
  );
}
