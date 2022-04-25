exports.options = [
  {
    type: 'HOST',
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
