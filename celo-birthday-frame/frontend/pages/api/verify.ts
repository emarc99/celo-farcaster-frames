import { NextApiRequest, NextApiResponse } from "next";
import { getUserIdentifier, SelfBackendVerifier } from "@selfxyz/core";
import { ethers } from "ethers";
import { ContractAbi, ContractAddress } from "@/data/abi";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { proof, publicSignals } = req.body;

      if (!proof || !publicSignals) {
        return res
          .status(400)
          .json({ message: "Proof and publicSignals are required" });
      }

      console.log("Proof:", proof);
      console.log("Public signals:", publicSignals);

      const rpc = process.env.NEXT_PUBLIC_RPC_URL as string;

      // // Uncomment this to use the Self backend verifier for offchain verification instead
      // // const selfdVerifier = new SelfBackendVerifier(
      // //     rpc,
      // //     "Self-Denver-Birthday",
      // //     "your ngrok endpoint",
      // //     "hex",
      // // //  true // If you want to use mock passport
      // // );
      // // const result = await selfdVerifier.verify(proof, publicSignals);
      // // console.log("Verification result:", result);

      const address = await getUserIdentifier(publicSignals, "hex");
      console.log("Extracted address from verification result:", address);

      // // Connect to Celo network
      const provider = new ethers.JsonRpcProvider(rpc);
      const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
      const contract = new ethers.Contract(
        ContractAddress,
        ContractAbi,
        signer
      );

      const proofData = {
        a: proof.a,
        b: [
          [proof.b[0][1], proof.b[0][0]],
          [proof.b[1][1], proof.b[1][0]],
        ],
        c: proof.c,
        pubSignals: publicSignals,
      };

      console.log(proofData);

      try {
        // VERIFY PROOF
        const tx = await contract.verifySelfProof(proofData);
        await tx.wait();
        console.log("Successfully called verifySelfProof function");

        res.status(200).json({
          status: "success",
          result: true,
          credentialSubject: {},
        });
      } catch (error) {
        console.error("Error calling verifySelfProof function:", error);
        res.status(400).json({
          status: "error",
          result: false,
          message: "Verification failed or date of birth not disclosed",
          details: {},
        });
        throw error;
      }
    } catch (error) {
      console.error("Error verifying proof:", error);
      return res.status(500).json({
        status: "error",
        message: "Error verifying proof",
        result: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
