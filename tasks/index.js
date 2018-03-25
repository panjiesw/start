// @flow
import assert from 'assert'
import Sequence from '@start/sequence/src/'
import xargs from '@start/xargs/src/'
// import Parallel from '@start/parallel/src/'
import Reporter from '@start/reporter/src/'
import env from '@start/env/src/'
import find from '@start/find/src/'
import findGitStaged from '@start/find-git-staged/src/'
import clean from '@start/clean/src/'
import read from '@start/read/src/'
import babel from '@start/lib-babel/src/'
import write from '@start/write/src/'
import overwrite from '@start/overwrite/src/'
import watch from '@start/watch/src/'
import eslint from '@start/lib-eslint/src/'
import flowCheck from '@start/lib-flow-check/src/'
// import flowGenerate from '@start/plugin-flow-generate/src/'
import prettierEslint from '@start/lib-prettier-eslint/src/'
import { istanbulInstrument, istanbulReport, istanbulThresholds } from '@start/lib-istanbul/src/'
import tape from '@start/lib-tape/src/'
// import npmVersion from '@start/npm-version/src/'
import npmPublish from '@start/plugin-npm-publish/src/'
import tapDiff from 'tap-diff'

// const parallel = Parallel()
const reporter = Reporter()
const sequence = Sequence(reporter)

const babelConfig = {
  babelrc: false,
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 6,
        },
        exclude: ['transform-regenerator'],
      },
    ],
    '@babel/preset-flow',
  ],
  plugins: ['@babel/plugin-proposal-object-rest-spread'],
}

export const build = (packageName: string) =>
  sequence(
    env('NODE_ENV', 'production'),
    find(`packages/${packageName}/build/`),
    clean,
    find(`packages/${packageName}/src/**/*.js`),
    read,
    babel(babelConfig),
    write(`packages/${packageName}/build/`)
  )

export const builds = xargs(build)

export const dev = (packageName: string) =>
  sequence(
    find(`packages/${packageName}/build/`),
    clean,
    watch(`packages/${packageName}/src/**/*.js`)(
      sequence(read, babel(babelConfig), write(`packages/${packageName}/build/`))
    )
  )

export const lint = () =>
  sequence(findGitStaged(['packages/*/@(src|test)/**/*.js', 'tasks/**/*.js']), eslint())

export const lintAll = () =>
  sequence(find(['packages/*/@(src|test)/**/*.js', 'tasks/**/*.js']), eslint())

export const fix = () =>
  sequence(
    find(['packages/*/@(src|test)/**/*.js', 'tasks/**/*.js']),
    read,
    prettierEslint(),
    overwrite
  )

export const test = () =>
  sequence(
    find('packages/*/src/**/*.js'),
    istanbulInstrument({ esModules: true }),
    find('packages/*/test/**/*.js'),
    tape(tapDiff),
    istanbulReport(['lcovonly', 'html', 'text-summary']),
    istanbulThresholds({ functions: 30 }),
    flowCheck()
  )

export const ci = () => sequence(lintAll(), test())

export const publish = (packageName: string, /* version: string, */ otp: string) => {
  assert(packageName, 'Package name is required')
  // assert(version, 'Version is required')
  assert(otp, 'OTP is required')

  return sequence(
    ci(),
    build(packageName),
    // npmVersion(version, `packages/${packageName}`),
    npmPublish(`packages/${packageName}`, { otp })
  )
}
