import React, { useContext } from 'react';
import DataContext from '../../context/data';
import _ from 'lodash';
import EntityView from '../entityView';
import calculate, { checkTags } from '../../context/calculate';
import { StackItem, Card, CardBody } from 'nr1';
import { generateFakeName, pickWorkloadColor } from '../../../shared/utils';

// eslint-disable-next-line no-unused-vars
export default function WorkloadView(props) {
  const dataContext = useContext(DataContext);
  const { selectedTags, obfuscate, userConfig } = dataContext;
  const { workload, workloadCostTotal } = props;

  if (obfuscate) {
    workload.results.forEach(e => {
      e.name = generateFakeName();
    });
  }

  const groupedEntities = _.groupBy(workload.results, e => e?.type);

  return (
    <>
      {Object.keys(groupedEntities)
        .sort((a, b) => {
          const costA = calculate({
            workloadData: { results: groupedEntities[a] }
          });
          const costB = calculate({
            workloadData: { results: groupedEntities[b] }
          });

          const serviceTotalA = costA?.known || 0 + costA?.estimated || 0;
          const serviceTotalB = costB?.known || 0 + costB?.estimated || 0;

          return serviceTotalB - serviceTotalA;
        })
        .map(g => {
          const filteredEntities = groupedEntities[g].filter(e =>
            checkTags(e, selectedTags)
          );

          if (groupedEntities[g].length === 0) {
            return null;
          }

          const cost = calculate({
            workloadData: { results: groupedEntities[g] }
          });
          const serviceTotal = cost?.known || 0 + cost?.estimated || 0;
          const costPercentage = (serviceTotal / workloadCostTotal) * 100;
          const { costColor, costFontColor } = pickWorkloadColor(
            isNaN(costPercentage) ? 0 : costPercentage
          );

          return (
            <StackItem key={g} grow style={{ width: '99%' }}>
              <Card>
                <CardBody style={{ marginTop: 0, marginBottom: 0 }}>
                  {costPercentage > 0 && (
                    <div
                      style={{
                        borderTop: `5px solid ${costColor}`,
                        marginLeft: '15px',
                        paddingBottom: '1px',
                        color: costFontColor
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          backgroundColor: costColor,
                          width: '155px',
                          color: costFontColor,
                          marginTop: '-1px'
                        }}
                      >
                        &nbsp;{costPercentage.toFixed(2)}% of workload cost
                      </div>
                    </div>
                  )}
                  <EntityView
                    key={g}
                    group={g}
                    entities={filteredEntities}
                    obfuscate={obfuscate}
                    cardListView={userConfig?.collectionView}
                  />
                </CardBody>
              </Card>
            </StackItem>
          );
        })}
    </>
  );
}
