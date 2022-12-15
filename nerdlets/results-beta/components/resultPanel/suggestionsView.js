import React, { useState } from 'react';
import {
  Badge,
  navigation,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  StackItem,
  Card,
  CardHeader,
  CardBody,
  SectionMessage
} from 'nr1';
import _ from 'lodash';

function SuggestionsView(props) {
  const { workloadData } = props;
  const [column, setColumn] = useState(0);
  const [sortingType, setSortingType] = useState(
    TableHeaderCell.SORTING_TYPE.NONE
  );

  const onClickTableHeaderCell = (nextColumn, { nextSortingType }) => {
    if (nextColumn === column) {
      setSortingType(nextSortingType);
    } else {
      setSortingType(nextSortingType);
      setColumn(nextColumn);
    }
  };

  const headers = [
    { key: 'Message', value: ({ item }) => item.message },
    { key: 'Response', value: ({ item }) => item.response },
    { key: 'Current Value', value: ({ item }) => item.value },
    { key: 'Check Value', value: ({ item }) => item.checkValue }
  ];

  return (
    <>
      <StackItem grow style={{ width: '99%' }}>
        <Badge type={Badge.TYPE.INFO}>BETA</Badge>

        {Object.keys(workloadData).map(guid => {
          const data = workloadData[guid];

          const filteredEntities = (data?.results || []).filter(
            e => e.suggestions
          );

          if (filteredEntities.length === 0) {
            return (
              <Card collapsible key={guid}>
                <CardHeader style={{ fontSize: '16px' }}>
                  {data.name}
                </CardHeader>
                <CardBody>
                  <SectionMessage
                    type={SectionMessage.TYPE.SUCCESS}
                    title="No suggestions found for this workload"
                    description="You can edit the suggestions configuration in the main screen by the row actions drop down if required."
                  />
                </CardBody>
              </Card>
            );
          }

          const groupedEntities = _.groupBy(filteredEntities, e => e?.type);

          return Object.keys(groupedEntities).map(g => {
            const entities = groupedEntities[g];

            return (
              <Card key={`${guid}.${g}`} collapsible>
                <CardHeader style={{ fontSize: '16px' }}>
                  {data.name}
                </CardHeader>
                <CardBody>
                  <Card key={guid} collapsible>
                    <CardHeader style={{ marginTop: '0px' }}>{g}</CardHeader>
                    <CardBody>
                      {entities.length > 0 ? (
                        <>
                          {entities.map(e => {
                            return (
                              <>
                                <Card key={guid} collapsible>
                                  <CardHeader style={{ marginTop: '0px' }}>
                                    {e.name} -{' '}
                                    <span
                                      style={{
                                        cursor: 'pointer',
                                        color: '#017C86'
                                      }}
                                      onClick={() =>
                                        navigation.openStackedEntity(e.guid)
                                      }
                                    >
                                      View Entity
                                    </span>
                                  </CardHeader>
                                  <CardBody>
                                    <Table items={e.suggestions}>
                                      <TableHeader>
                                        {headers.map((h, i) => (
                                          // eslint-disable-next-line react/jsx-key
                                          <TableHeaderCell
                                            {...h}
                                            sortable
                                            sortingType={
                                              column === i
                                                ? sortingType
                                                : TableHeaderCell.SORTING_TYPE
                                                    .NONE
                                            }
                                            onClick={(event, data) =>
                                              onClickTableHeaderCell(i, data)
                                            }
                                          >
                                            {h.key}
                                          </TableHeaderCell>
                                        ))}
                                      </TableHeader>

                                      {({ item }) => {
                                        return (
                                          <TableRow
                                            actions={[]}
                                            style={{ height: '150px' }}
                                          >
                                            <TableRowCell>
                                              {item.message}
                                            </TableRowCell>
                                            <TableRowCell>
                                              {item.response}
                                            </TableRowCell>
                                            <TableRowCell>
                                              {item.value}
                                            </TableRowCell>
                                            <TableRowCell>
                                              {item.checkValue}
                                            </TableRowCell>
                                          </TableRow>
                                        );
                                      }}
                                    </Table>
                                  </CardBody>
                                </Card>
                              </>
                            );
                          })}
                        </>
                      ) : (
                        <SectionMessage
                          type={SectionMessage.TYPE.SUCCESS}
                          title="No suggestions to provide"
                          description="You can see and edit the available options on the main screen in the row actions."
                        />
                      )}
                    </CardBody>
                  </Card>
                </CardBody>
              </Card>
            );
          });
        })}
      </StackItem>
    </>
  );
}

export default SuggestionsView;
