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

exports.k8sClusterExpansionQuery = (guid, cursor) => {
  return `query k8sClusterExpansionQuery($clusterGuid: EntityGuid!) {
    actor {
      entity(guid: "${guid}") {
        relatedEntities(filter: {direction: OUTBOUND, entityDomainTypes: {include: {type: "HOST", domain: "INFRA"}}} ${
          cursor ? `,cursor: "${cursor}"` : ''
        }) {
          results {
            target {
              entity {
                guid
                name
                domain
                type
                entityType
              }
            }
          }
          nextCursor
        }
      }
    }
  }`;
};
