const fs = require('fs');
const path = require('path');

async function main() {
  const artifactsDir = path.join(__dirname, '../artifacts/contracts');
  const outputDir = path.join(__dirname, '../../frontend/src/contracts');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const contracts = [
     { name: 'ReputationSystem', file: 'ReputationSystem.sol' },
     { name: 'EqubManager', file: 'EqubManager.sol' },
     { name: 'LendingPool', file: 'LendingPool.sol' },
     { name: 'Governance', file: 'Governance.sol' }
   ];

  contracts.forEach(contract => {
    const artifactPath = path.join(artifactsDir, `${contract.file}/${contract.name}.json`);
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      fs.writeFileSync(
        path.join(outputDir, `${contract.name}.json`),
        JSON.stringify(artifact.abi, null, 2)
      );
      console.log(`Exported ABI for ${contract.name}`);
    } else {
      console.warn(`Artifact not found for ${contract.name} at ${artifactPath}`);
    }
  });
}

main().catch(console.error);
