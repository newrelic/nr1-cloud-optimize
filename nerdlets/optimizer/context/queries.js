import { ngql } from 'nr1';

export const initQuery = ngql`
  {
    actor {
      user {
        email
        id
      }
      accounts(scope: GLOBAL) {
        id
        name
      }
    }
  }
`;

export const workloadDiscoveryQuery = cursor => ngql`
{
  actor {
    entitySearch(query: "type = 'WORKLOAD'") {
      results${cursor ? `(cursor: "${cursor}")` : ''} {
        entities {
          ... on WorkloadEntityOutline {
            guid
            name
            alertSeverity
            account {
              id
              name
            }
            tags {
              key
              values
            }
          }
        }
        nextCursor
      }
    }
  }
}
`;

export const userApiKeysQuery = (userId, accountId, cursor) => ngql`{
  actor {
    apiAccess {
      keySearch(query: {types: USER, scope: {userIds: ${userId}, accountIds: ${accountId}}}${
  cursor ? `, cursor: "${cursor}"` : ''
}) {
        keys {
          ... on ApiAccessUserKey {
            id
            name
            key
          }
        }
        nextCursor
      }
    }
  }
}
`;

export const userApiCreateQuery = (userId, accountId) => ngql`mutation {
  apiAccessCreateKeys(keys: {user: {accountId: ${accountId}, name: "NR1-OPTIMIZER-KEY", notes: "Used for the nr1 optimizer application", userId: ${userId}}}) {
    createdKeys {
      id
      key
      name
      notes
      type
      createdAt
    }
  }
}
`;
