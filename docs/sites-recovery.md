# Sites publication and recovery

Local editing and Test/Test2 document publication do not deploy ACM Studio.
Production uses the Sites project identified in [hosting.json](../.openai/hosting.json).
The source branch is `main`. Sites publication is separate from a GitHub push.
There is no Studio staging target.

## Before publication

1. Read the project ID from the checked-out hosting file. Use Sites **Get site**
   with that exact ID and verify the intended workspace, audience, and production
   URL against Studio's production entry in the site registry.
2. List saved versions for that project. For the current successful production
   deployment, record the saved version ID and number, source commit, deployment
   ID, URL, and any archive digest. Check the deployment status by its deployment
   ID. Resolve the source commit in Git. Retain the saved version and archive.
3. Verify the proposed revision locally, including a production build, affected
   browser checks, and read/write compatibility with [current storage](storage-formats.md).
   An older client can encounter a newer IndexedDB schema or newer drafts at the
   same origin. Exercise that combination on a disposable origin using synthetic
   data. Preserve a verified backup before any data-affecting recovery.
4. With explicit authorisation for this production target, publish the exact
   verified revision through Sites. Record the new saved version and deployment.
   Poll the deployment to completion, check that its version matches the source,
   then open the production URL and check the affected route independently.

## Restore a known-good version

1. Confirm the affected site, failing deployment, intended recovery version,
   source revision, audience, and authority for the production rollback.
2. Select the **existing saved version** that previously passed the relevant
   checks. Confirm that it can read the data now present on the origin.
   If compatibility is unknown or fails, preserve data and prepare a forward
   fix. Restoring site code cannot rewind browser-local files.
3. Deploy that saved version to the same project with the existing audience.
   Keep both saved versions. Poll the returned deployment ID and compare its
   saved version ID with the selected recovery version. On failure, record the
   status and leave the retained version available.
4. Verify the production URL, affected route, and source-to-version record.
   Record the observation time in UTC, the operator, and the result.

## Historical reference for a local rehearsal

On 22 November 2026, Sites reported successful deployments for saved version 8
(`82d4446a253cf1dc96a68267270132f529189d83`) and version 7
(`691ce979a0f3de3fa47169befe33d1d517b38e0c`). Both commits contain the same Studio project ID. Their readers support
workspace versions through v24 and publications through v18. They cannot reopen
a workspace written by the current Studio writer. Use a compatible build for
any origin with newer data, and refresh the provider evidence before a real rollback. To rehearse the source lookup offline from the repository root, run
`git show --no-patch --format='%H %s' 82d4446a 691ce979` and compare both
full commit IDs with the saved-version records.
