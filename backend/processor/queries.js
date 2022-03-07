exports.workloadEntityFetchQuery = (guid, cursor) => {
  return `
    {
      actor {
        entity(guid: "${guid}") {
          ... on WorkloadEntity {
            guid
            name
            relatedEntities${cursor ? `(cursor: "${cursor}")` : ''} {
              results {
                target {
                  entity {
                    guid
                    name
                    type
                    entityType
                    domain
                    account {
                      name
                      id
                    }
                  }
                }
              }
              nextCursor
            }
          }
        }
      }
    }
  `;
};
