**This repo contains the source files for the QGIS TUFLOW Plugin changelog.**

This readme describes:

* The [changelog philosophy](#philosophy)
* How to [build the documents](#how-to-build)
* The adopted [style guide and conventions](#style-guide-and-conventions)

## Philosophy

The philosophy behind this changelog is to advertise the cool new features and enhancements that we all work hard to develop. With that in mind, the idea is to write a brief description for each new feature/enhancement and try and include a nice image or video for each one - think of it almost like a powerpoint slide on the feature. The description itself **does not** need to go into detail on how to use the feature. The implementation detail should be written on the TUFLOW Wiki and the relevant page should be referred to and linked to in the changelog.

## Getting Setup

In terms of an IDE, something like [Visual Studio Code](https://code.visualstudio.com/) or PyCharm is quite good as it (like many IDEs) has native git and markdown support as well as a terminal (powershell or cmd) which can be used to build the docs. It does nothing that is absolutely required for the process, so feel free to use your favourite IDE if you want. Once the project is setup and you have VS Code installed, right click the project folder and select "Open with Code" to open the entire project rather just a single file.

### Clone Repository

Clone the repository with git:

1. Open a terminal session
2. Navigate to where the project folder will be saved
3. Clone the repo: `git clone git@bmt-gitlab.bmt-wbm.local:tuflow/manual/qgis-tuflow-plugin-changelog.git`

### How to Build

Instead of R, this uses Ruby and Jekyll to build the docs. The below instructions have been taken from the following site and repeated here for convenience with a few additional notes for clarification.
[https://jekyllrb.com/docs/installation/windows/](https://jekyllrb.com/docs/installation/windows/)

### Install Ruby For Windows and Jekyll

1. Download and install a **Ruby+Devkit** (x64) version from [RubyInstaller Downloads](https://rubyinstaller.org/downloads/). At the time of writing this README, the ruby version that was used was `3.3.5`. Use default options for installation.
2. Run the `ridk install` step on the last stage of the installation wizard. This is needed for installing gems with native extensions. You can find additional information regarding this in the [RubyInstaller Documentation](https://github.com/oneclick/rubyinstaller2#using-the-installer-on-a-target-system). From the options choose `MSYS2 and MINGW development toolchain` (by entering `3` and pressing `enter`). After it is done, it may go back to the initial question and say something like, "if unsure press enter". At this stage it is done and you can close the window.
3. Open a new command prompt window from the start menu, so that changes to the `PATH` environment variable becomes effective. Install Jekyll and Bundler using `gem install jekyll bundler`.
4. Check if Jekyll has been installed properly: `jekyll -v`. The Jekyll version at the time of writing this is `4.3.4`. If you want to install a specific version of `jekyll` and `bundler` then use the following commands:
    1. `gem uninstall jekyll bundler` (if you need/want to uninstall the current versions you have)
    2. `gem install jekyll -v 4.3.4`
    3. `gem install bundler -v 2.5.16`

### Install just-the-docs

[Just-the-docs](https://just-the-docs.com/) is the template that is used. Before you build the documentation for the first time, you will need to run the following command in a terminal within the project root directory to install just-the-docs: `bundle install`. It is important to check if you have any duplicate libraries installed as this can affect the build process. Please make sure to follow the steps in the next section.

### Removing Duplicate Libraries

It is recommended to check for, and remove any duplicate libraries. Run `gem list` in the terminal to see all the libraries that are installed. If you see any duplicates, you can remove them by running `gem uninstall <library_name>`. If you are unsure which version to remove, you can remove all versions of that particular library, and then run `bundle install` to re-install the correct versions (which are specified in the [gemfile](Gemfile)). See [troubleshooting section](#troubleshooting) below if you run into any permission errors.

**Note:** one library this is especially important to check for is `sass-embedded` (check the [gemfile](Gemfile) for the correct version).

**Note:** if you've built the docs already, you should also delete the `jekyll-cache` folder after updating library versions.

### Building the Documentation

Within a terminal session, and within the project root directory, you can run `.\serve.ps1` in powershell to build and serve the documents. Once it is running, open a browser and navigate to `http://localhost:4000/qgis-tuflow-plugin/changelog/` to view the built documents.

If you make updates to any of the markdown documents, the page should automatically update when you save your changes and it is just a matter of refreshing the browser to see the updates. This is also true for some configuration changes, however when some configuration settings may require stopping the service (`ctrl+c`) and rerunning the `serve` script to get the changes.

## Style Guide and Conventions

### General Rules

* Past tense - descriptions should be written in past tense
* You don't need to start each feature description with the version name e.g. "Release 2024.0.0 does so and so..." as this is redundant since the entire page is already dedicated to this particular release.
* It is ok to use inline code formatting if it is appropriate e.g. when referring to a `QT` boundary type or `Should not be here`
* Please try your best to add an image or video for each new feature or enhancement
* Citations/Referencing - at the moment there is no support for this so please don't make any citations. Reserve this sort of documentation for the manual.
* Do not use phrases such as "coming soon" on "in an upcoming release".
* Generally equations don't need to go in the changelog and can be put in the manual but if you really want to use an equation, this has not been setup yet, so please chat to Ellis

### Labels

Label(s) can be added next to a new feature or enhancement section titles. The available labels are:

* Major Feature
* Experimental

Multiple labels can be applied to any given heading.

The method of adding is as follows:

```
### TUFLOW CATCH
{: .d-inline-block}

Major Feature
{: .label .label-major-feature}
```

The initial `{: .d-inline-block}` sets the label to be inline with the heading.

### Images and Videos

Any images and videos should be added to the `assets/<version>` folder. Examples of how to reference them is demonstrated below:

**Image:**

```
![]({{ site.baseurl }}/assets/2024-0-0/tin_example.png)
```

**Video:**

```
<video style="max-width:640px" controls>
  <source src="{{ site.baseurl }}/assets/2024-0-0/estry_ad_wq.mp4" type="video/mp4">
</video>
```

### Jekyll Filter for Formatting

Claude (AI) created a Jekyll filter that we can use for formatting. For example, you can use the code below to do style the command within a call out box and the filter will do the \<tcmd\>, \<teq\>, \<tblk\> commands:

```
{: .tcf-command}
> [{{"TIN Triangulation Approach == Method B" | style_command}}](https://docs.tuflow.com/classic-hpc/manual/2024/TCFCommands-1.html#tcfTINTriangulationApproach)
```

It can even format multiple lines including comments and If statements but the convention is slightly different. It captures the text into a variable

```
{% capture command_text %}
! Testing formatting
If Scenario == ScenarioA
   TIN Triangulation Approach == Method B
   Start Date == 01/01/2024
   End Date == 02/01/2024
End If
{% endcapture %}
{{ command_text | prepare_text | style_command }}
```

### Updating Library Versions

This is a general note on how to upgrade library versions. When library versions need to be updated, these will most likely be specified in the [gemfile](Gemfile). To update your libraries, open a terminal in the root directory and re-run `bundle install`. This works for upgrading as well as downgrading library versions.

### Troubleshooting

#### Permission Error

Sometimes Ruby will error saying it doesn't have file permissions. To get around this you can try the following:

1. Open a terminal session as admin
2. Try whatever the command is you were executing again
3. If you get an error like `gem is not a recognised command` then you have to add the Ruby `bin` directory to the path<br>
In command prompt:<br>
`path C:\Ruby33-x64\bin;%path%`<br>
In powershell:<br>
`$env:Path += ";C:\Ruby33-x64\bin"`

#### Formatting Looks Wrong

If the document builds but looks odd (the formatting is strange or some of the media isn't displaying properly), then it could be that Ruby is using the wrong library versions. For instance, if you upgraded a particular library the old library might still be being used. Please read the [Removing Duplicate Libraries](#removing-duplicate-libraries) section above to fix this.
