export const getEc2Instance = (region, instanceType, index) => {
  return new Promise(resolve => {
    fetch(
      `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/compute/pricing/${region}.json`
    )
      .then(response => {
        return response.json();
      })
      .then(json => {
        if (json) {
          const products = json?.products || [];
          const matchedInstances = products.filter(
            p => p.type === instanceType
          );

          json.index = index;
          if (matchedInstances.length > 0) {
            resolve(matchedInstances);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      })
      .catch(() => {
        console.log('error getting ec2 instance pricing');
        resolve(null);
      });
  });
};
