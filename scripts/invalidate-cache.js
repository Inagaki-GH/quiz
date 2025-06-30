const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

const client = new CloudFrontClient({ region: 'us-east-1' }); // CloudFrontはus-east-1

async function invalidateCache(distributionId, paths = ['/*']) {
  try {
    const command = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: paths.length,
          Items: paths
        },
        CallerReference: `invalidation-${Date.now()}`
      }
    });

    const response = await client.send(command);
    console.log(`✓ Cache invalidation started: ${response.Invalidation.Id}`);
    console.log(`  Distribution: ${distributionId}`);
    console.log(`  Paths: ${paths.join(', ')}`);
    
    return response.Invalidation.Id;
  } catch (error) {
    console.error('✗ Cache invalidation failed:', error.message);
    throw error;
  }
}

// コマンドライン実行
if (require.main === module) {
  const args = process.argv.slice(2);
  const distributionId = args[0];
  const paths = args.slice(1).length > 0 ? args.slice(1) : ['/*'];

  if (!distributionId) {
    console.error('Usage: node invalidate-cache.js <distribution-id> [path1] [path2] ...');
    console.error('Example: node invalidate-cache.js E1234567890ABC /index.html /app.js');
    process.exit(1);
  }

  invalidateCache(distributionId, paths);
}

module.exports = { invalidateCache };