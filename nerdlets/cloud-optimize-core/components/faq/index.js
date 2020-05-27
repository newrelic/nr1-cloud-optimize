import React from 'react';
import { Message, Input, Header } from 'semantic-ui-react';

const faqs = [
  {
    cat: 'Instance Optimizer',
    question: 'What metrics do you use for optimization calculations?',
    answer:
      'Max values are used, see the optimization configs for further metrics and configuration.'
  },
  {
    cat: 'Instance/Workload Optimizer',
    question: `I'm missing tags and/or groups.`,
    answer:
      'Install the relevant infrastructure cloud integration so that the metadata can be retrieved.'
  },
  {
    cat: 'Instance/Workload Optimizer',
    question: `How many days/weeks/months does this application analyze?`,
    answer:
      'The default is 7 days. You can select a custom time range by enabling the time picker in the menu bar and then selecting the time range.'
  },
  {
    cat: 'Workload Optimizer',
    question: `How do I create a workload?`,
    answer: 'Go to the New Relic One home page and select workloads.'
  },
  {
    cat: 'Optimization Configs',
    question: `What happens if I set multiple optimization configs that overlap?`,
    answer: 'The following precedence is used Workload > Account > User.'
  },
  {
    cat: 'Misc',
    question: `I'm missing accounts and entities, where are they?`,
    answer:
      'Click Cloud Optimize in the Application Catalog and check under "Manage Access". If manually deployed ensure the uuid and profile that was used have targeted the relevant accounts.'
  },
  {
    cat: 'Misc',
    question: `The app is crashing, what can I do?`,
    answer:
      'Check the network and console log for any errors, and raise an issue on github with as much detail as possible.'
  },
  {
    cat: 'Misc',
    question: `I have a great suggestion, where can I put a feature request?`,
    answer: 'Raise it as an issue via github.'
  }
];

export default class FAQ extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      filterText: ''
    };
  }

  render() {
    const { filterText } = this.state;
    const fLower = filterText.toLowerCase();
    const filteredFaqs = faqs.filter(
      f =>
        f.cat.toLowerCase().includes(fLower) ||
        f.question.toLowerCase().includes(fLower) ||
        f.answer.toLowerCase().includes(fLower)
    );

    return (
      <>
        <Header as="h3" content="Frequently Asked Questions" />
        <Input
          placeholder="Search..."
          value={filterText}
          onChange={(e, d) => this.setState({ filterText: d.value })}
          style={{ width: '50%' }}
        />

        {filteredFaqs.map((f, i) => {
          return (
            <Message key={i}>
              <Message.Header>{f.question}</Message.Header>
              <Message.Content>{f.answer}</Message.Content>
            </Message>
          );
        })}
      </>
    );
  }
}
