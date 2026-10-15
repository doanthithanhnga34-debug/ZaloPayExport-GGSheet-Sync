import path from "node:path";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();

const bucketName = process.env.ARTIFACT_BUCKET!;

export async function uploadArtifact(
  filePath: string,
): Promise<string> {
  const destination =
    `zalopay-errors/${Date.now()}-${path.basename(filePath)}`;

  await storage
    .bucket(bucketName)
    .upload(filePath, {
      destination,
    });

  return `gs://${bucketName}/${destination}`;
}