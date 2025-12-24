import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedDeepVault = await deploy("DeepVault", {
    from: deployer,
    log: true,
  });

  console.log(`DeepVault contract: `, deployedDeepVault.address);
};
export default func;
func.id = "deploy_deepVault"; // id required to prevent reexecution
func.tags = ["DeepVault"];
