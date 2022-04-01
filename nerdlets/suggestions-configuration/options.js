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
        direction: 'below',
        getValue: data => data?.SystemSample?.['max.cpuPercent']
      },
      lowMemory: {
        label: 'Low Memory',
        description: '',
        message: '',
        response: 'downsize',
        type: 'number',
        defaultValue: 5,
        direction: 'below',
        getValue: data => data?.SystemSample?.['max.memoryPercent']
      },
      highCPU: {
        label: 'High CPU',
        description: '',
        message: '',
        response: 'upsize',
        type: 'number',
        defaultValue: 85,
        direction: 'above',
        getValue: data => data?.SystemSample?.['max.cpuPercent']
      },
      highMemory: {
        label: 'High Memory',
        description: '',
        message: '',
        response: 'upsize',
        type: 'number',
        defaultValue: 85,
        direction: 'above',
        getValue: data => data?.SystemSample?.['max.memoryPercent']
      }
    }
  }
];
