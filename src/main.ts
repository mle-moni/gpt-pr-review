import * as core from '@actions/core'
import * as github from '@actions/github'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Starting action...`)

    // Fetching github token and getting octokit client
    const githubToken = core.getInput('github-token')
    const octokit = github.getOctokit(githubToken)

    // Get the context
    const { owner, repo, number } = github.context.issue

    // Get PR files modified
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: number
    })

    for (const file of files) {
      const filePath = file.filename
      const sha = file.sha

      // Get the file content
      const { data: fileContent } = await octokit.rest.git.getBlob({
        owner,
        repo,
        file_sha: sha
      })

      // Decode the content from base64
      const decodedContent = Buffer.from(
        fileContent.content,
        'base64'
      ).toString('utf8')
      console.log(decodedContent)
      console.log(`File Path: ${filePath}`)
      console.log(`File Content: ${decodedContent}`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
