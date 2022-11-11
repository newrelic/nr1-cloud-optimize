exports.options = [
  {
    type: 'HOST',
    config: {
      cpuRightSize: {
        label: 'CPU Right Size',
        description:
          'If a suggestion is to be provided multiple the cpu count by this value',
        type: 'number',
        defaultValue: 0.5
      },
      memRightSize: {
        label: 'Memory Right Size',
        description:
          'If a suggestion is to be provided multiple the memory by this value',
        type: 'number',
        defaultValue: 0.5
      },

      cpuUpper: {
        label: 'CPU Upper Percent',
        description: 'If cpu below this value request an optimization',
        type: 'number',
        defaultValue: 50
      },
      memUpper: {
        label: 'Memory Upper Percent',
        description: 'If memory below this value request an optimization',
        type: 'number',
        defaultValue: 50
      },
      cpuMemUpperOperator: {
        label: 'CPU & Memory Upper Limit Operator',
        description:
          'If both or one of these values are met request an optimization',
        type: 'enum',
        defaultValue: 'AND',
        items: [
          { title: 'AND', value: 'AND' },
          { title: 'OR', value: 'OR' }
        ]
      },
      staleCpu: {
        label: 'CPU Stale Percent',
        description: 'If cpu below this value consider stale',
        type: 'number',
        defaultValue: 5
      },
      staleMem: {
        label: 'Memory Upper Percent',
        description: 'If memory below this value consider stale',
        type: 'number',
        defaultValue: 5
      },
      cpuMemUpperStaleOperator: {
        label: 'CPU & Memory Stale Operator',
        description: 'If both or one of these values are met consider stale',
        type: 'enum',
        defaultValue: 'AND',
        items: [
          { title: 'AND', value: 'AND' },
          { title: 'OR', value: 'OR' }
        ]
      },
      staleReceiveBytesPerSec: {
        label: 'Receieve Bytes Per Sec Staleness',
        description: 'If receive bytes per sec below this value consider stale',
        type: 'number',
        defaultValue: 5
      },
      staleTransmitBytesPerSec: {
        label: 'Transmit Bytes Per Sec Staleness',
        description:
          'If transmit bytes per sec below this value consider stale',
        type: 'number',
        defaultValue: 5
      },
      rxTxStaleOperator: {
        label: ' Recieve & Transmit Stale Operator',
        description: 'If both or one of these values are met consider stale',
        type: 'enum',
        defaultValue: 'AND',
        items: [
          { title: 'AND', value: 'AND' },
          { title: 'OR', value: 'OR' }
        ]
      },
      // includedInstanceTypes: {
      //   label: 'Included Instance Types',
      //   description:
      //     'Only return instances that are matched from this comma separated list',
      //   type: 'string',
      //   defaultValue: '',
      //   placeholder: 'Enter a comma separated list'
      // },
      excludedInstanceTypes: {
        label: 'Excluded Instance Types',
        description:
          'Do not return instances that are matched from this comma separated list',
        type: 'string',
        defaultValue: '',
        placeholder: 'Enter a comma separated list'
      }
    },
    suggestionsConfig: {
      lowCPU: {
        label: 'Low CPU',
        description: '',
        message: '',
        response: 'downsize',
        type: 'number',
        defaultValue: 5,
        operator: 'below',
        getValue: data => data?.SystemSample?.['max.cpuPercent']
      },
      lowMemory: {
        label: 'Low Memory',
        description: '',
        message: '',
        response: 'downsize',
        type: 'number',
        defaultValue: 5,
        operator: 'below',
        getValue: data => data?.SystemSample?.['max.memoryPercent']
      },
      highCPU: {
        label: 'High CPU',
        description: '',
        message: '',
        response: 'upsize',
        type: 'number',
        defaultValue: 90,
        operator: 'above',
        getValue: data => data?.SystemSample?.['max.cpuPercent']
      },
      highMemory: {
        label: 'High Memory',
        description: '',
        message: '',
        response: 'upsize',
        type: 'number',
        defaultValue: 90,
        operator: 'above',
        getValue: data => data?.SystemSample?.['max.memoryPercent']
      }
    }
  },
  {
    type: 'AWSRDSDBINSTANCE',
    suggestionsConfig: {
      highCPU: {
        label: 'High CPU',
        description: '',
        message: '',
        response: 'upsize',
        type: 'number',
        defaultValue: 90,
        operator: 'above',
        getValue: data =>
          data?.DatastoreSample?.['max.provider.cpuUtilization.Maximum']
      },
      highMemory: {
        label: 'High Memory',
        description: '',
        message: '',
        response: 'upsize',
        type: 'number',
        defaultValue: 90,
        operator: 'above',
        getValue: data => data?.DatastoreSample?.memoryUsage
      }
    }
  }
];
